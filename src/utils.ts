import { Request, Response } from 'express'
import _ from 'lodash'

export function regexEscape(str: string) {
  return str.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')
}

export function createRegex(input: string, flags: string = 'i') {
  const escapedInput = regexEscape(input)
  return new RegExp(escapedInput, flags)
}

export function handleError(
  err: any,
  options: any,
  req: Request,
  res: Response
) {
  const fields = options.fields.map((field: any) => {
    return {
      ...field,
      value: req.body[field.name],
    }
  })

  if (!err.errors) {
    res.render('create', {
      ...options,
      errors: [JSON.stringify(err)],
      fields,
    })
  }

  const errors = Object.keys(err.errors).map(key => {
    const error = err.errors[key]
    const message = error.message
    return message.replace('(`' + error.value + '`)', '')
  })

  res.render('create', {
    ...options,
    errors,
    fields,
  })
}

export function parseBody(body: any) {
  return Object.keys(body).reduce((acc: any, key) => {
    let value = body[key]

    if (value === '') {
      return acc
    }

    // checkbox
    if (
      Array.isArray(value) &&
      value.includes('false') &&
      value.includes('checkbox_true')
    ) {
      value = value.filter(x => x !== 'false').map(x => 'true')
    }

    if (key.includes('[]') && !Array.isArray(value)) {
      value = [value]
    }

    const newAcc = { ...acc }
    if (Array.isArray(value)) {
      value = value.filter(x => x !== '')

      value.forEach((item: any, index: number) => {
        const path = key.replace('[]', '[' + index + ']')
        _.set(newAcc, path, item)
      })

      return newAcc
    }

    _.set(newAcc, key, value)
    return newAcc
  }, {})
}

export function generateFields(paths: any, nestedName = ''): any[] {
  const fields = Object.keys(paths)
    .filter(key => key !== '_id' && key !== '__v')
    .map(key => {
      const field = paths[key]
      const { options } = field
      const type = parseType(field)

      const base = {
        title: _.startCase(key),
        name: nestedName + (type === 'array' ? key + '[]' : key),
        type,
        required: field.isRequired,
        default: options.default,
      }

      if (
        base.type === 'text' ||
        base.type === 'textarea' ||
        base.type === 'wizard'
      ) {
        return {
          ...base,
          minlength: options.minlength,
          maxlength: options.maxlength,
          // element: options.element
        }
      }

      if (base.type === 'number') {
        return {
          ...base,
          min: options.min,
          max: options.max,
        }
      }

      if (base.type === 'date') {
        return {
          ...base,
          min: formatDate(options.min),
          max: formatDate(options.max),
          default: formatDate(options.default),
        }
      }

      if (base.type === 'checkbox') {
        return {
          ...base,
          value: 'checkbox_true',
        }
      }

      // object array
      const schemaPaths: any = _.get(field, 'schema.paths')
      if (base.type === 'array' && schemaPaths) {
        return {
          ...base,
          items: generateFields(schemaPaths, base.name),
        }
      }

      // single value array
      if (base.type === 'array') {
        const items = generateFields({ [key]: field.caster })
        items[0].hideLabel = true
        items[0].name = nestedName + items[0].name + '[]'
        return {
          ...base,
          required: items[0].required,
          items,
        }
      }
    })
  return _.sortBy(fields, ['title'])
}

export function parseType(field: any) {
  const type = field.instance.toLowerCase()
  switch (type) {
    case 'string':
      const element = _.get(field, 'options.element')

      if (element === 'textarea' || element === 'wizard') {
        return element
      }

      return 'text'
    case 'boolean':
      return 'checkbox'
    default:
      return type
  }
}

export function formatDate(
  date: number | Date | (() => number) | undefined | string
) {
  if (date === undefined) {
    return undefined
  }

  if (typeof date === 'function') {
    return convertDateToString(new Date(date()))
  }

  if (typeof date === 'number') {
    return convertDateToString(new Date(date))
  }

  if (typeof date === 'string') {
    return convertDateToString(new Date(date))
  }

  return convertDateToString(date)
}

function convertDateToString(date: Date) {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .split('T')[0]
}
