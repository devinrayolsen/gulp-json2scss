var through = require('through'),
	chalk = require('chalk'),
	gulpmatch = require('gulp-match'),
	path = require('path'),
	gutil = require('gulp-util'),
	beautify = require('js-beautify').css;

var firstCharacterIsNumber = /^[0-9]/;
module.exports = function(options) {
	options = options || {};
	options.delim = options.delim || '-';
	options.eol = ';';
	options.emptyKeyFirst = options.emptyKeyFirst === undefined ? true : !!options.emptyKeyFirst;
	options.skipDelimAtEmptyKeys = options.skipDelimAtEmptyKeys === undefined ? true : !!options.skipDelimAtEmptyKeys;
	options.ignoreJsonErrors = !!options.ignoreJsonErrors;
	options.firstCharacter = options.firstCharacter || '_';
	options.prefixFirstNumericCharacter = options.prefixFirstNumericCharacter === undefined ? true : options.prefixFirstNumericCharacter;

	return through(ProcessJSON);
	
	function ProcessJSON(file) {
		var ParsedJSON;
		var SCSSVar = [];

		// if it does not have a .json suffix, ignore the file
		if (!gulpmatch(file,'**/*.json')) {
			this.push(file);
			return;
		}

		// load the JSON
		try {
			ParsedJSON = JSON.parse(file.contents);
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
		RecursiveLoad(ParsedJSON, '', 
			function (string) {
				if(string === '' && SCSSVar[SCSSVar.length - 1] === ''){
					return;
				}
				if(typeof options.interceptor === 'function' && string !== '') {
					string = string.split(':');
					string = options.interceptor(string[0], string[1]);
				}
				SCSSVar.push(string);
			}
		);
		file.contents = Buffer(beautify(SCSSVar.join('\n'), { indent_size: 1, indent_char:"	" }));
		file.path = gutil.replaceExtension(file.path, '.scss');
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
		var collection;
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
			collection = BuildObject(val, key, 0);
			callback(collection);
		}
	}

	function BuildObject(object, key, lvl, type){
		var length = ObjectLength(object);
		var collection = end = prop = delimiter = '';

		if(typeof type == 'undefined'){
			type = (key.charAt(0) == '$')?'mapping':'selector';
			end = (key.charAt(0) == '$')?(options.eol):'';
		}
		for(prop in object){
			if(typeof object[prop] === 'object'){ //we have more levels
				collection += BuildObject(object[prop], prop, lvl++, type);
			}else{ //reached no further nesting levels
				delimiter = (type == 'mapping')? (length > 1)?',':'':';';
				collection += prop+((prop.charAt(0) == '@')?' ':': ')+object[prop] + delimiter;
			}
			length--;			
		}

		if(type == 'selector'){
			return key + ' {'+ collection +'}'+end;
		}else if(type == 'mapping'){
			return key + ': (' + collection +')'+end;
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