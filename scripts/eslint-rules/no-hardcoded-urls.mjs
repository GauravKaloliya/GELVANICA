/**
 * ESLint custom rule: ban hardcoded URLs that should come from env vars.
 *
 * Catches:
 *   - 'localhost:3000', 'localhost:3001', 'localhost:3002', 'localhost:5000'
 *   - 'api.gnovium.com', 'gnovium.com' (in URLs)
 *
 * These should use NEXT_PUBLIC_* env vars instead.
 *
 * Usage in eslint.config.mjs:
 *   import noHardcodedUrlsPlugin from './scripts/eslint-rules/no-hardcoded-urls.mjs';
 *   { plugins: { 'no-hardcoded-urls': noHardcodedUrlsPlugin }, rules: { 'no-hardcoded-urls/no-hardcoded-urls': 'error' } }
 */

const HARDCODED_PATTERNS = [
  /localhost:\d{4}/,
  /api\.gnovium\.com/,
  /gnovium\.com\/(?!\s|$)/,
];

function containsHardcodedUrl(value) {
  if (typeof value !== 'string') return false;
  return HARDCODED_PATTERNS.some((p) => p.test(value));
}

const rules = {
  'no-hardcoded-urls': {
    meta: {
      type: 'suggestion',
      docs: {
        description:
          'Ban hardcoded URLs that should use NEXT_PUBLIC_* env vars',
      },
      schema: [],
      messages: {
        hardcodedUrl:
          'Hardcoded URL "{{value}}" detected. Use NEXT_PUBLIC_* env vars instead.',
      },
    },
    create(context) {
      function checkNode(node) {
        const value =
          node.type === 'Literal'
            ? node.value
            : node.type === 'TemplateLiteral' && node.quasis.length === 1
              ? node.quasis[0].value.raw
              : null;

        if (value && containsHardcodedUrl(value)) {
          context.report({
            node,
            messageId: 'hardcodedUrl',
            data: { value },
          });
        }
      }

      return {
        Literal: checkNode,
        TemplateLiteral(node) {
          if (node.quasis.length === 1) checkNode(node);
        },
      };
    },
  },
};

export default { rules };
