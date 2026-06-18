<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>

<template>
  <div class="reset-view">
    <h1>Account Reset</h1>
    <p class="info-message">
      Please contact your system administrator to reset your account credentials.
      Authentication is managed via your organization's identity provider.
    </p>
    <RouterLink to="/login" class="back-link">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="vertical-align: middle; margin-right: 4px;">
        <line x1="19" y1="12" x2="5" y2="12"></line>
        <polyline points="12 19 5 12 12 5"></polyline>
      </svg>
      Back to Login
    </RouterLink>
  </div>
</template>

<style scoped>
.reset-view {
  padding: 4rem 2rem;
  text-align: center;
  max-width: 600px;
  margin: 0 auto;
}

h1 {
  margin-bottom: 1.5rem;
  color: var(--color-heading);
}

.info-message {
  background-color: #e8f4fd;
  border: 1px solid #bee3f8;
  color: #2b6cb0;
  padding: 1.5rem;
  border-radius: 8px;
  margin-bottom: 2rem;
  line-height: 1.6;
}

.back-link {
  color: hsla(160, 100%, 37%, 1);
  font-weight: bold;
  text-decoration: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.back-link:hover {
  background-color: hsla(160, 100%, 37%, 0.1);
}
</style>
