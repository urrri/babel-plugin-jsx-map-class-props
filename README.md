# babel-plugin-jsx-map-class-props

[![Travis build status](http://img.shields.io/travis/urrri/babel-plugin-jsx-map-class-props/master.svg?style=flat-square)](https://travis-ci.org/urrri/babel-plugin-jsx-map-class-props)
[![NPM version](http://img.shields.io/npm/v/babel-plugin-jsx-map-class-props.svg?style=flat-square)](https://www.npmjs.org/package/babel-plugin-jsx-map-class-props)


Merges className compatible attributes to className or other compatible attributes.

* [Installation](#installation)
* [How does it work?](#how-does-it-work)
* [Configuration](#configuration)
  * [Option](#options)
  * [Attribute Mapping Options](#attribute-mapping-options)
  * [Allowed combination of source-target options](#allowed-combination-of-source-target-options)
* [Runtime source attribute value resolution and formatting](#runtime-source-attribute-value-resolution-and-formatting)
* [Have a question or want to suggest an improvement?](#have-a-question-or-want-to-suggest-an-improvement)

## Installation

When `babel-plugin-jsx-map-class-props` cannot resolve Class Names at a compile time, it imports a helper functions (read [Runtime source attribute value resolution](#runtime-source-attribute-value-resolution-and-formatting)). Therefore, you must install `babel-plugin-jsx-map-class-props` as a direct dependency of the project.

```bash
npm install babel-plugin-jsx-map-class-props --save
```

## How does it work?

1. Iterates through all [JSX](https://facebook.github.io/react/docs/jsx-in-depth.html) element declarations.
1. Finds matched source attributes according to the mapping options.
    * If `clean` option is `true`, removes found source attribute from the element and continues to the next iteration.
1. Calculates target attribute names according to the mapping options.
1. Formats source attribute value according to the mapping options:
    * If value is a string literal, generates a string literal value.
    * If value is a [`jSXExpressionContainer`](https://github.com/babel/babel/tree/master/packages/babel-types#jsxexpressioncontainer) and format option is valid, uses a helper function ([`getClassName`](src/helpers/getClassName.js)) to format value at the runtime.
1. Merges source attribute value to the target attribute:
    * If target attribute doesn't exist, moves formatted source attribute to the target.
    * If source and target values are a string literal, generates a string literal value.
    * If source or target value is a [`jSXExpressionContainer`](https://github.com/babel/babel/tree/master/packages/babel-types#jsxexpressioncontainer), uses a helper function ([`joinClassNames`](src/helpers/joinClassNames.js)) to join values at the runtime.
1. Removes the source attribute from the element.

## Configuration

Configure the options for the plugin within your `.babelrc` as follows:

```json
{
  "plugins": [
    ["jsx-map-class-props", {
      "option": "value"
    }]
  ]
}

```

### Options

|Name|Type|Description|Default|
|---|---|---|---|
|`format`|`?GenerateScopedNameConfigurationType`|Global pattern for classNames formatting. Can be overridden by mapping option. Refer to [Generating scoped names](https://github.com/css-modules/postcss-modules#generating-scoped-names) and [Interpolate Name](https://github.com/webpack/loader-utils#interpolatename).|`none`|
|`clean`|`?boolean`|Remove all matching props. This option can be used for removing debug/test classNames from production build. Can be overridden by mapping option. Ignored if false |`false`|
|`mappings`|`AttributeMappingType []`|Array of attribute mapping options|`[]`|

#### Attribute Mapping Options
|Name|Type|Description|Default|
|---|---|---|---|
|`format`|`?GenerateScopedNameConfigurationType`|Pattern for classNames formatting. Can override global option. Set `null` to prevent formatting. Refer to [Generating scoped names](https://github.com/css-modules/postcss-modules#generating-scoped-names) and [Interpolate Name](https://github.com/webpack/loader-utils#interpolatename).  |`none`|
|`clean`|`?boolean`|Remove all matching props. This option can be used for removing debug/test classNames from production build. Can override global option by setting `false` explicitly.|`none`|
|`sourceName`|`?string`|Name of an attribute to be matched.||
|`sourceMask`|`?string`|[RegExp pattern](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp) string to match attribute. ||
|`prefix`|`?string`|String to match an attribute by prefix. Target attribute name will be calculated by removing prefix, if other options not specified.||
|`targetName`|`?string`|Name of the attribute, value will be merged to. This option has highest priority for target calculation. Can be used with any source option.||
|`targetMask`|`?string, ?function`|Second parameter of [`String.replace`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replace). Can be used only with `sourceMask`, which will be uses as a first parameter. Allows calculate attribute name to merge value to.||

Missing a configuration? [Raise an issue](https://github.com/urrri/babel-plugin-jsx-map-class-props/issues/new?title=New%20configuration:).

#### Allowed combination of source-target options 
**(in priority order)**

|Source|Target| Strategy Description|
|---|---|---|
|`sourceName`| `targetName`| match attribute by exact `sourceName`, merge with `targetName` attribute|
|`sourceMask`| `targetName`| match attribute by `sourceMask` RegExp, merge with `targetName` attribute|
|`sourceMask`| `targetMask`| match attribute by `sourceMask` RegExp, calculate target using `foundName.replace(sourceMask, targetMask)`, merge with target attribute|
|`prefix`| `targetName`| match attribute by `prefix`, merge with `targetName` attribute|
|`prefix`| | match attribute by `prefix`, get target by stripping prefix, merge with target attribute|

> Notes:
> - only one combination per mapping is allowed
> - other options will be ignored (according to priority)
> - if attribute is matched by one mapping, other mappings are ignored 
>   (in other words, attribute can have only one target) 


### Runtime source attribute value resolution and formatting

When the value of source attribute cannot be determined at the compile time, `babel-plugin-jsx-map-class-props` uses [`getClassName`](src/helpers/getClassName.js) helper function to format attribute value at the runtime.

Input:

```js
<div test-className={Math.random() > .5 ? 'a' : 'b'} />;

```

Output:

```js
import _getClassName from 'babel-plugin-jsx-map-class-props/dist/browser/getClassName';

<div className={_getClassName(Math.random() > .5 ? 'a' : 'b', 'e2e-|')}></div>;

```

When the value of source or target attribute cannot be determined at the compile time, `babel-plugin-jsx-map-class-props` uses [`joinClassNames`](src/helpers/joinClassNames.js) helper function to join attribute values at the runtime.

Input:

```js
<div test-className={Math.random() > .5 ? 'a' : 'b'} className='other'/>;

```

Output:

```js
import _joinClassNames from 'babel-plugin-jsx-map-class-props/dist/browser/joinClassNames';

<div className={_joinClassNames(Math.random() > .5 ? 'a' : 'b', 'other')}></div>;

```

## Have a question or want to suggest an improvement?

* Have a technical questions? [Ask on Stack Overflow.](http://stackoverflow.com/questions/ask?tags=babel-plugin-jsx-map-class-props)
* Have a feature suggestion or want to report an issue? [Raise an issues.](https://github.com/urrri/babel-plugin-jsx-map-class-props/issues)

