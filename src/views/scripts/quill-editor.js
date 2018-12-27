const quillDivs = document.querySelectorAll('.quill-editor')
const quillEditors = []

quillDivs.forEach(quillDiv => {
  const options = JSON.parse(quillDiv.getAttribute('data-options'))
  const quillEditor = new Quill(quillDiv, {
    modules: {
      toolbar: options.toolbar || [
        [{ header: [1, 2, false] }],
        ['bold', 'italic', 'underline'],
        ['image', 'code-block'],
      ],
    },
    placeholder: 'Compose an epic...',
    theme: 'snow',
  })

  const value = options.value || options.default

  if (value) {
    quillEditor.setContents(JSON.parse(value))
  }

  quillEditors.push(quillEditor)
})

const form = document.querySelector('form')

if(form) {
  form.onsubmit = onFormSubmit
}

function onFormSubmit {
  for (let i = 0; i < quillDivs.length; i++) {
    const quillDiv = quillDivs[i]
    const quillEditor = quillEditors[i]
    const options = JSON.parse(quillDiv.getAttribute('data-options'))
    const quillValue = JSON.stringify(quillEditor.getContents())
    const smallText = document.querySelector('.small-' + options.name)
    smallText.innerHTML = ''

    if (options.required && quillValue.length <= 1) {
      smallText.innerHTML = `${options.name} is required`
      return false
    }

    if (options.minlength && quillValue.length < options.minlength) {
      smallText.innerHTML = `${options.name} must be longer than ${
        options.minlength
      } characters`
      return false
    }

    if (options.maxlength && quillValue.length > options.maxlength) {
      smallText.innerHTML = `${options.name} must be shorter than ${
        options.maxlength
      } characters`
      return false
    }

    const hiddenField = document.querySelector(
      'input[name=' + options.name + ']'
    )
    hiddenField.value = quillValue
  }
}
