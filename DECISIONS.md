## Decisions

- Used zod package to validate requests body
- Chose to not replace to placeholders containing spaces, i.e. `{{ variable }}` as it might be plain text
- Used pg-mem as persistence to be able to write sql queries without having to depend on an external database

## What could be improved

- Unit test coverage of use cases in application package
- Paginate the templates returned for a given search by tag and by name
- Create an endpoint to get all the versions of a given template (and paginate the results)

