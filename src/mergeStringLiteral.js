// @flow

import BabelTypes, {
  isJSXExpressionContainer,
  isStringLiteral,
  JSXAttribute,
  stringLiteral
} from 'babel-types';
import getClassName from './helpers/getClassName';
import joinClassNames from './helpers/joinClassNames';

/**
 * Merges class names of provided attribute into target attribute (e.g className) of a JSX element.
 */
export default (
    t: BabelTypes,
    path: *,
    sourceAttribute: JSXAttribute,
    targetName: string,
    getJoinerIdentifier,
    format: string
): void => {
  const formattedClassName = getClassName(sourceAttribute.value.value, format);

  const targetAttribute = path.node.openingElement.attributes.find(
      attribute => typeof attribute.name !== 'undefined' && attribute.name.name === targetName);

  if (targetAttribute) {

    if (isJSXExpressionContainer(targetAttribute.value) && isStringLiteral(targetAttribute.value.expression)) {
      targetAttribute.value = targetAttribute.value.expression;
    }

    if (isStringLiteral(targetAttribute.value)) {

      targetAttribute.value.value = joinClassNames(targetAttribute.value.value, formattedClassName);

    } else if (isJSXExpressionContainer(targetAttribute.value)) {

      targetAttribute.value.expression =
          t.callExpression(
              t.clone(getJoinerIdentifier()),
              [
                targetAttribute.value.expression,
                stringLiteral(formattedClassName)
              ]
          );
    } else {
      throw new Error('Unexpected attribute value:' + targetAttribute.value);
    }

  } else if (formattedClassName) {
    sourceAttribute.name.name = targetName;
    sourceAttribute.value.value = formattedClassName;

    return;
  }

  path.node.openingElement.attributes.splice(path.node.openingElement.attributes.indexOf(sourceAttribute), 1);
};
