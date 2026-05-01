<script setup>
// Redirect all errors (including 404) back to home — this app has no valid sub-routes
// that should show an error page.
clearError({ redirect: '/' })
</script>
