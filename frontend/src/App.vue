<template>
  <div class="container mt-4">
    <h1 class="mb-4">WhatsApp Server API Dashboard</h1>
    <NumberManager />
    <hr />
    <MessageManager />
  </div>
</template>

<script>
import NumberManager from './components/NumberManager.vue';
import MessageManager from './components/MessageManager.vue';

export default {
  components: {
    NumberManager,
    MessageManager
  }
};
</script>

<style>
body {
  background-color: #f8f9fa;
}
</style>
