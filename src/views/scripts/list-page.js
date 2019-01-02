const selectRowBoxes = document.querySelectorAll('.select-row')
const tableForm = document.querySelector('.table-form')
const selectPageBox = document.querySelector('.select-page')
const deleteRowButton = document.querySelector('.delete-selected-rows')

if (selectPageBox) {
  selectPageBox.addEventListener('change', event => {
    selectRowBoxes.forEach(
      checkbox => (checkbox.checked = event.target.checked)
    )
  })
}

if (deleteRowButton) {
  deleteRowButton.addEventListener('click', event => {
    if (!tableForm) { return }

    const formData = new FormData(tableForm)
    if (!formData.get('_id')) {
      return alert('Select a row')
    }

    alert('Delete these row(s)?')

    tableForm.submit()
  })
}
