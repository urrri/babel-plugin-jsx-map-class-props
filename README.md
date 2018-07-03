# babel-plugin-jsx-map-class-props

[![Travis build status](http://img.shields.io/travis/urrri/babel-plugin-jsx-map-class-props/master.svg?style=flat-square)](https://travis-ci.org/urrri/babel-plugin-jsx-map-class-props)
[![NPM version](http://img.shields.io/npm/v/babel-plugin-jsx-map-class-props.svg?style=flat-square)](https://www.npmjs.org/package/babel-plugin-jsx-map-class-props)


Merges class names from any attribute with `className` or other compatible attributes.

* [Installation](#installation)
* [Why?](#why)
* [Configuration](#configuration)
  * [Options](#options)
  * [Attribute Mapping Options](#attribute-mapping-options)
    * [Allowed combination of source-target options](#allowed-combinations-of-source-target-options)
  * [Out File Options](#out-file-options)
* [How does it work?](#how-does-it-work)
* [Runtime attribute value formatting and merging](#runtime-attribute-value-formatting-and-merging)
* [Saving mapped class names in the file](#saving-mapped-class-names-in-the-file)
    * [Custom out file format](#custom-out-file-format)
* [Have a question or want to suggest an improvement?](#have-a-question-or-want-to-suggest-an-improvement)

## Installation

When `babel-plugin-jsx-map-class-props` cannot resolve attribute value at compile time, it imports helper functions (read [Runtime attribute value formatting and merging](#runtime-attribute-value-formatting-and-merging)). Therefore, you must install `babel-plugin-jsx-map-class-props` as a direct dependency of the project.

```bash
npm install babel-plugin-jsx-map-class-props --save
```

## Why?

The idea was born when I tried to identify the components in our E2E tests. 
First of all I tried to find a property that most components pass to the DOM. I read about `testId`, `data-test-id` and some others, but our components library isn't aware of any of them.
Then I thought about `className`. It is supported by most components. But we use CSS-modules, which decorates the class names, and so they cannot be simply recognized by e2e test. So we have to use additional classes for tests and combine them with the existing ones, and that makes a mess. Also we need to strip them in production. 
Finally, the combination of both directions gave me a new idea: i could put an identifier into a different property and merge it with the `className` at compile time. It also solved the issue of stripping these properties for production.

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
|`context`|`?string`|[Scoped names](https://github.com/webpack/loader-utils#interpolatename) will be calculated relative to this path. |`process.cwd()`|
|`format`|`?string`|Global pattern for class names formatting. Can be overridden by mapping option. Refer to [Generating scoped names](https://github.com/css-modules/postcss-modules#generating-scoped-names) and [Interpolate Name](https://github.com/webpack/loader-utils#interpolatename).||
|`clean`|`?boolean`|Removes all matching props. This option can be used for removing debug/test classNames from production build. Can be overridden by mapping option. Ignored if false |`false`|
|`mappings`|`AttributeMappingType[]`|Array of [attribute mapping options](#attribute-mapping-options). Must be defined at least one mapping|`[]`|
|`outFileName`|`?string`|File name, relative to the [CWD](https://nodejs.org/docs/latest/api/process.html#process_process_cwd) of Babel. Allows to [save mapped class names in the file](#saving-mapped-class-names-in-the-file). Can be overridden by mapping option. ||
|`outFiles`|`?OutFileType[]`|[Additional options](#out-file-options) for the output files defined by the `outFileName` options. ||

### Attribute Mapping Options
|Name|Type|Description|Default|
|---|---|---|---|
|`format`|`?string`|Pattern for class names formatting. Can override global option. Set `null` to prevent formatting. Refer to [Generating scoped names](https://github.com/css-modules/postcss-modules#generating-scoped-names) and [Interpolate Name](https://github.com/webpack/loader-utils#interpolatename).  ||
|`clean`|`?boolean`|Removes all matching props. This option can be used for removing debug/test classNames from production build. Can override global option by being set to `false` explicitly.||
|`sourceName`|`?string`|Name of an attribute to be matched.||
|`sourceMask`|`?string`|[RegExp pattern string](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp) to find matching attributes. ||
|`prefix`|`?string`|String to find matching attributes by prefix. Target attribute's name will be calculated by removing prefix, if other options not specified.||
|`targetName`|`?string`|Name of the attribute the value will be merged with. This option has the highest priority for target calculation. Can be used with any source option.||
|`targetMask`|`?(stringǀfunction)`|Second parameter of [`String.replace`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replace). Can only be used with `sourceMask`, which will be used as a first parameter. Allows to calculate attribute name to merge value with.||
|`outFileName`|`?string`|File name, relative to the [CWD](https://nodejs.org/docs/latest/api/process.html#process_process_cwd) of Babel. Allows to [save mapped class names in the file](#saving-mapped-class-names-in-the-file). Can override global option.||

#### Allowed combinations of source-target options 
**(in priority order)**

|Source|Target| Strategy Description|
|---|---|---|
|`sourceName`| `targetName`| match attribute by exact `sourceName`, merge with `targetName` attribute|
|`sourceMask`| `targetName`| match attribute by `sourceMask` RegExp, merge with `targetName` attribute|
|`sourceMask`| `targetMask`| match attribute by `sourceMask` RegExp, calculate target using `foundName.replace(sourceMask, targetMask)`, merge with target attribute|
|`prefix`| `targetName`| match attribute by `prefix`, merge with `targetName` attribute|
|`prefix`| | match attribute by `prefix`, get target by stripping prefix, merge with target attribute|

> **Notes**:
> - only one combination per mapping is allowed
> - other options will be ignored (according to priority)
> - if attribute is matched by a mapping, other mappings are ignored 
>   (in other words, an attribute can have only one target) 

### Out File Options
|Name|Type|Description|Default|
|---|---|---|---|
|`name`|`string`|Name of the file that should match `outFileName` option value.||
|`format`|`?('js'ǀ'json'ǀfunction)`|Format of the out file content or `function` for the [custom file formatting](#custom-out-file-format).|`'js'`|
|`flat`|`?boolean`|If `true`, merges all groups together to a flat list.  |`false`|
|`varFormat`|`?string`|Pattern for variable names formatting. Refer to [Generating scoped names](https://github.com/css-modules/postcss-modules#generating-scoped-names) and [Interpolate Name](https://github.com/webpack/loader-utils#interpolatename).  ||
|`groupFormat`|`?string`|Pattern for variable group names formatting. Refer to [Generating scoped names](https://github.com/css-modules/postcss-modules#generating-scoped-names) and [Interpolate Name](https://github.com/webpack/loader-utils#interpolatename). *Ignored if `flat` option is `true`* |`'[path]-[name]'`|
|`case`|`?('camel'ǀ'upper')`|Post-processes variable name and changes case as following: <ul><li>`camel` - *theVarName*</li><li>`upper` - *THE_VAR_NAME*</li></ul> _**Note**: any non-alphanumeric character will be compacted_ |`'camel'`|

Missing a configuration? [Raise an issue](https://github.com/urrri/babel-plugin-jsx-map-class-props/issues/new?title=New%20configuration:).

## How does it work?

1. Iterates through all [JSX](https://facebook.github.io/react/docs/jsx-in-depth.html) element declarations.
1. Finds matched source attributes according to the mapping options.
    * If `clean` option is `true`, removes the source attribute that was found from the element and continues to the next iteration.
1. Calculates target attribute names according to the mapping options.
1. Formats source attribute value according to the mapping options:
    * If value is a string literal, generates a string literal value.
    * If value is a [`jSXExpressionContainer`](https://github.com/babel/babel/tree/master/packages/babel-types#jsxexpressioncontainer) and format option is valid, uses a helper function ([`getClassName`](src/helpers/getClassName.js)) to format value at runtime.
1. Merges source attribute value with the target attribute:
    * If target attribute doesn't exist, moves formatted source attribute to the target.
    * If source and target values are a string literal, generates a string literal value.
    * If source or target value is a [`jSXExpressionContainer`](https://github.com/babel/babel/tree/master/packages/babel-types#jsxexpressioncontainer), uses a helper function ([`joinClassNames`](src/helpers/joinClassNames.js)) to join values at runtime.
1. Removes the source attribute from the element.
1. If `outFileName` option is present, adds variable to the file according to the options defined for the file


## Runtime attribute value formatting and merging

When the value of a source attribute cannot be determined at compile time, `babel-plugin-jsx-map-class-props` uses [`getClassName`](src/helpers/getClassName.js) helper function to format the value at runtime.

Input:

```js
<div test-className={Math.random() > .5 ? 'a' : 'b'} />;

```

Output:

```js
import _getClassName from 'babel-plugin-jsx-map-class-props/dist/browser/getClassName';

<div className={
  _getClassName(Math.random() > .5 ? 'a' : 'b', 'e2e-|')
} />;

```

When the value of a source or a target attribute cannot be determined at compile time, `babel-plugin-jsx-map-class-props` uses [`joinClassNames`](src/helpers/joinClassNames.js) helper function to join the values at runtime.

Input:

```js
<div test-className='my-component' className={styles.myComponent} />;

```

Output:

```js
import _joinClassNames from 'babel-plugin-jsx-map-class-props/dist/browser/joinClassNames';

<div className={
  _joinClassNames('e2e-my-component', styles.myComponent)
} />;

```

## Saving mapped class names in the file

To simplify using mapped class names in e.g. tests, there can be defined output file(s) (`outFileName` option) into which the plugin will put constants, matching appropriated class names. The output file can have JavaScript, JSON or [custom](#custom-out-file-format) format (`format` option). The constants can be grouped by the input files or be presented as a flat list (`flat` option). Group names and constant names can be decorated with [scoped name pattern](https://github.com/webpack/loader-utils#interpolatename) (`groupFormat`, `varFormat` options). Then names will be compacted and converted to camelCase or UPPER_SNAKE_CASE format (`case` option). All non-alphanumeric characters will be removed (including $ sign).

>**Note**: only classes defined with string literals will be saved into the out files.<br> Classes defined as expressions or using the Spread operator (...) can be resolved at runtime only.  

### Custom out file format

`format` option of an out file can be defined as a `function` with the following arguments:
* `groups` - preprocessed (filtered and formatted) array of groups of constants:
    ```js
    [
        // group
        {
            // group identifier, formatted using options.groupFormat and options.case 
            // (undefined, if options.flat === true)
            name: 'string', 
            items: [
                // constant
                {
                    // identifier, formatted using options.varFormat and options.case 
                    name: 'string',
                    // formatted (final) class name
                    value: 'string'
                }
            ]
        }
    ]
    ```
* `options` - out file options (read only)

The function should return a `string` that represents the custom content ready to be saved in the out file.

## Have a question or want to suggest an improvement?

* Have technical questions? [Ask on Stack Overflow.](http://stackoverflow.com/questions/ask?tags=babel-plugin-jsx-map-class-props)
* Have a feature suggestion or want to report an issue? [Raise an issues.](https://github.com/urrri/babel-plugin-jsx-map-class-props/issues)

