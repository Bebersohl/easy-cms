document.querySelectorAll('.field-select').forEach(select => {
  const ref = select.getAttribute('data-ref')

  if (!ref) { return }

  fetch(`/cms/api/${ref}/all`)
    .then(res => {
      res.json().then(docs => {
        docs.forEach(doc => {
          const option = document.createElement('option')

          const keys = Object.keys(doc)
            .filter(key => key !== '_id' && key !== '__v')
            .map(key => doc[key])

          option.value = doc._id
          option.text = keys.join(', ')
          select.appendChild(option)
        })
      })
    })
    .catch(err => {
      console.error(err)
    })
})
