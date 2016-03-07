var through = require('through'),
	chalk = require('chalk'),
	gulpmatch = require('gulp-match'),
	path = require('path'),
	gutil = require('gulp-util');

var firstCharacterIsNumber = /^[0-9]/;

module.exports = function(options) {
	options = options || {};
	options.delim = options.delim || '-';
	options.sass = !!options.sass;
	options.eol = options.sass ? '' : ';';
	options.emptyKeyFirst = options.emptyKeyFirst === undefined ? true : !!options.emptyKeyFirst;
	options.skipDelimAtEmptyKeys = options.skipDelimAtEmptyKeys === undefined ? true : !!options.skipDelimAtEmptyKeys;
	options.groupRelated = options.groupRelated === undefined ? true : !!options.groupRelated;
	options.ignoreJsonErrors = !!options.ignoreJsonErrors;
	options.firstCharacter = options.firstCharacter || '_';
	options.prefixFirstNumericCharacter = options.prefixFirstNumericCharacter === undefined ? true : options.prefixFirstNumericCharacter;

	return through(processJSON);
	
	function processJSON(file) {
		var parsedJSON, sass;
		// if it does not have a .json suffix, ignore the file
		if (!gulpmatch(file,'**/*.json')) {
			this.push(file);
			return;
		}

		// load the JSON
		try {
			parsedJSON = JSON.parse(file.contents);
		} catch (e) {
			if (options.ignoreJsonErrors) {
				console.log(chalk.red('[gulp-json-scss]') + ' Invalid JSON in ' + file.path + '. (Continuing.)');
			} else {
				console.log(chalk.red('[gulp-json-scss]') + ' Invalid JSON in ' + file.path);
				this.emit('error', e);
			}
			return;
		}

		// process the JSON
		var sassVariables = [];

		RecursiveLoad(parsedJSON, '', 
			function (assignmentString) {
				if(assignmentString === '' && sassVariables[sassVariables.length - 1] === ''){
					return;
				}
				if(typeof options.interceptor === 'function' && assignmentString !== '') {
					assignmentString = assignmentString.split(':');
					assignmentString = options.interceptor(assignmentString[0], assignmentString[1]);
				}
				sassVariables.push(assignmentString);
			}
		);
		sass = sassVariables.join('\n').trimRight();
		file.contents = Buffer(sass);
		file.path = gutil.replaceExtension(file.path, options.sass ? '.sass' : '.scss');
		this.push(file);
	}

	function  RecursiveLoad(obj, path, callback) {
		// load empty keys first
		if(options.emptyKeyFirst && '' in obj) {
			CollectVariables(obj, path, callback, '');
		}

		for (var key in obj) {
			if (obj.hasOwnProperty(key)) {

				// load empty keys first
				if(options.emptyKeyFirst && key === '') {
					continue;
				}

				CollectVariables(obj, path, callback, key);
			}
		}
	}

	function CollectVariables(obj, path, callback, key) {
		var val = obj[key];

		// sass variables cannot begin with a number
		if (path === '' && firstCharacterIsNumber.exec(key) && options.prefixFirstNumericCharacter) {
			key = options.firstCharacter + key;
		}

		// skip delimiters for empty keys
		if(options.skipDelimAtEmptyKeys && key === '') {
			path = path.slice(0, -1);
		}

		if (typeof val !== 'object') {
			callback(key + ': ' + val + options.eol);
		} else {
			var collection = BuildObject(val, key, 0);
			callback(collection+((key.charAt(0) == '$')?options.eol:''));
			// group related sass variables by newline
			if (options.groupRelated) {
				callback('');
			}
		}
	}

	function BuildObject(object, key, lvl, type){
		var length = ObjectLength(object);
		var collection = '';
		if(typeof type == 'undefined'){
			type = (key.charAt(0) == '$')?'mapping':'selector';
		}

		for(var prop in object){
			if(typeof object[prop] === 'object'){
				collection += BuildObject(object[prop], prop, lvl++, type);
			}else{
				var delimiter = (type == 'mapping')? (length > 1)?',\n\r':'':';\n\r';
				if(prop.charAt(0) == '@'){
					collection += prop+' '+object[prop]+delimiter;
				}else{
					collection += prop+': '+object[prop]+delimiter;
				}
			}
			length--;			
		}

		if(type == 'selector'){
			return key + ' {\n\r' + collection +'\n\r}\n\r';
		}else if(type == 'mapping'){
			return key + ': (\n\r' + collection +'\n\r)\n\r';
		}
	}

	function ObjectLength( object ) {
		var length = 0;
		for( var key in object ) {
				if( object.hasOwnProperty(key) ) {
						++length;
				}
		}
		return length;
	}	
};