import { renderTemplate, MissingVariablesError } from '../src/domain/renderer';

describe('renderTemplate', () => {
  describe('no placeholders', () => {
    it('returns content unchanged when there are no placeholders', () => {
      expect(renderTemplate('Hello world', [], {})).toBe('Hello world');
    });

    it('returns empty string unchanged', () => {
      expect(renderTemplate('', [], {})).toBe('');
    });
  });

  describe('basic substitution', () => {
    it('replaces a single placeholder with the provided value', () => {
      expect(renderTemplate('Hello {{name}}', [], { name: 'Alice' })).toBe('Hello Alice');
    });

    it('replaces multiple distinct placeholders', () => {
      expect(
        renderTemplate('{{greeting}}, {{name}}!', [], { greeting: 'Hi', name: 'Bob' }),
      ).toBe('Hi, Bob!');
    });
  });

  describe('default values', () => {
    it('uses a declared default when no value is provided', () => {
      const result = renderTemplate('Hello {{name}}', [{ name: 'name', default: 'World' }], {});
      expect(result).toBe('Hello World');
    });

    it('resolves multiple placeholders entirely from defaults', () => {
      const result = renderTemplate(
        '{{a}} {{b}}',
        [
          { name: 'a', default: 'foo' },
          { name: 'b', default: 'bar' },
        ],
        {},
      );
      expect(result).toBe('foo bar');
    });
  });

  describe('provided values override defaults', () => {
    it('uses the provided value instead of the declared default', () => {
      const result = renderTemplate(
        'Hello {{name}}',
        [{ name: 'name', default: 'World' }],
        { name: 'Alice' },
      );
      expect(result).toBe('Hello Alice');
    });
  });

  describe('mixed resolution', () => {
    it('resolves some from provided values and others from defaults', () => {
      const result = renderTemplate(
        '{{greeting}}, {{name}}!',
        [{ name: 'greeting', default: 'Hello' }],
        { name: 'Carol' },
      );
      expect(result).toBe('Hello, Carol!');
    });
  });

  describe('extra provided variables', () => {
    it('ignores provided variables that have no matching placeholder', () => {
      const result = renderTemplate('Hello {{name}}', [], { name: 'Dave', unused: 'value' });
      expect(result).toBe('Hello Dave');
    });
  });

  describe('missing variables', () => {
    it('throws MissingVariablesError when a required placeholder has no value or default', () => {
      expect(() => renderTemplate('Hello {{name}}', [], {})).toThrow(MissingVariablesError);
    });

    it('lists the missing variable name in the error', () => {
      try {
        renderTemplate('Hello {{name}}', [], {});
      } catch (err) {
        expect(err).toBeInstanceOf(MissingVariablesError);
        expect((err as MissingVariablesError).missingVariables).toContain('name');
      }
    });

    it('lists all missing variables when multiple are unresolved', () => {
      try {
        renderTemplate('{{a}} {{b}} {{c}}', [], {});
      } catch (err) {
        expect(err).toBeInstanceOf(MissingVariablesError);
        const missing = (err as MissingVariablesError).missingVariables;
        expect(missing).toContain('a');
        expect(missing).toContain('b');
        expect(missing).toContain('c');
      }
    });

    it('is not a generic Error but specifically MissingVariablesError', () => {
      expect(() => renderTemplate('{{x}}', [], {})).toThrow(MissingVariablesError);
    });
  });

  describe('placeholder pattern edge cases', () => {
    it('matches placeholders with underscores', () => {
      expect(renderTemplate('{{first_name}}', [], { first_name: 'Eve' })).toBe('Eve');
    });

    it('matches placeholders that are pure digits', () => {
      expect(renderTemplate('{{123}}', [], { '123': 'num' })).toBe('num');
    });

    it('does not match placeholders with spaces — treated as plain text', () => {
      expect(renderTemplate('{{ name }}', [], {})).toBe('{{ name }}');
    });

    it('replaces all occurrences of the same placeholder', () => {
      expect(renderTemplate('{{x}} and {{x}}', [], { x: 'yes' })).toBe('yes and yes');
    });
  });

  describe('declared variables not in content', () => {
    it('ignores declared variables whose name does not appear in the content', () => {
      const result = renderTemplate(
        'Hello {{name}}',
        [
          { name: 'name', default: 'World' },
          { name: 'unused', default: 'ignored' },
        ],
        {},
      );
      expect(result).toBe('Hello World');
    });
  });
});
