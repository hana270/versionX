window.initializeDataTables = function() {
  $(document).ready(function() {
    if ($.fn.DataTable) {
      $('.datatable').DataTable();
    }
  });
};