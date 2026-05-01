<template>
    <div id="login">
        <p class="info-message">
            Authentication is handled automatically by the upstream proxy.
            If you are not authenticated, please contact your administrator.
        </p>
    </div>
</template>
  
<script lang="ts">
export default {
    name: "LoginForm",
};
</script>

<style scoped>
.info-message {
    background-color: #e8f4fd;
    border: 1px solid #bee3f8;
    color: #2b6cb0;
    padding: 12px;
    border-radius: 4px;
    margin-bottom: 15px;
    font-size: 0.9em;
}
</style>
