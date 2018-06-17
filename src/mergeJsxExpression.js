// @flow

import BabelTypes, {
  isJSXExpressionContainer,
  isStringLiteral,
  jSXAttribute,
  JSXAttribute,
  jSXExpressionContainer,
  jSXIdentifier
} from 'babel-types';

/**
 * Merges class names of provided attribute into target attribute (e.g className) of a JSX element.
 */
export default (
    t: BabelTypes,
    path: *,
    sourceAttribute: JSXAttribute,
    targetName: string,
    getFormatterIdentifier,
    getJoinerIdentifier,
    format: string
): void => {
  const targetAttribute = path.node.openingElement.attributes.find(
      attribute => typeof attribute.name !== 'undefined' && attribute.name.name === targetName);

  if (targetAttribute) {
    path.node.openingElement.attributes.splice(path.node.openingElement.attributes.indexOf(targetAttribute), 1);
  }

  path.node.openingElement.attributes.splice(path.node.openingElement.attributes.indexOf(sourceAttribute), 1);

  // Only provide formatting call expression if the options has format string
  // This helps save a few bits in the generated user code
  const targetExpression = format ? t.callExpression(
      t.clone(getFormatterIdentifier()),
      [
        sourceAttribute.value.expression,
        // createObjectExpression(t, options)
        t.stringLiteral(format)
      ]
  ) : sourceAttribute.value.expression;

  if (targetAttribute) {
    if (isStringLiteral(targetAttribute.value)) {
      path.node.openingElement.attributes.push(jSXAttribute(
          jSXIdentifier(targetName),
          jSXExpressionContainer(
              t.callExpression(
                  t.clone(getJoinerIdentifier()),
                  [
                    t.stringLiteral(targetAttribute.value.value + ' '),
                    targetExpression
                  ]
              )
          )
      ));
    } else if (isJSXExpressionContainer(targetAttribute.value)) {
      path.node.openingElement.attributes.push(jSXAttribute(
          jSXIdentifier(targetName),
          jSXExpressionContainer(
              t.callExpression(
                  t.clone(getJoinerIdentifier()),
                  [
                    targetAttribute.value.expression,
                    targetExpression
                  ]
              )
          )
      ));
    } else {
      throw new Error('Unexpected attribute value: ' + targetAttribute.value);
    }
  } else {
    path.node.openingElement.attributes.push(jSXAttribute(
        jSXIdentifier(targetName),
        jSXExpressionContainer(
            targetExpression
        )
    ));
  }
};
