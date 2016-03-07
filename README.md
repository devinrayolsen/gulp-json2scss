# Gulp JSON2SCSS

A very very simple parser module that allows you to gulp stream .json files into .scss precompile stylesheets.

## Variables
variables.json
```
{
    "$string": "'12'",
    "$int": 12
}
```
becomes variables.scss
```
$string: '12',
$int: 12
```

## Maps
colors.json
```
{
	"$colors": {
		"primary": "#e55030",
		"secondary": "#d1d2d4",
		"greyLight": "#eeeeee",
		"greyMedium": "#cccccc",
		"greyDark": "#6d6d6d"
	}
}
```
becomes colors.scss
```
$colors: (
		primary: #e55030,
		secondary: #d1d2d4,
		greyLight: #eee,
		greyMedium: #ccc,
		greyDark: #6d6d6d
);
```
## Includes
```
{
  "@include media(medium)": {
    "@include":"column(9, (includeGutterWidth: false))"
  }
}
```
becomes
```
@include media(medium)
{
    @include column(9, (includeGutterWidth: false));
}
```
## Placeholders
```
{
	"%clearfix": {
		"&::after": {
			"clear": "both",
			"content": "''",
			"display": "table"
		}
	}
}
```
becomes
```
%clearfix {
	&::after {
		clear: both;
		content: '';
		display: table;
	}
}
```
