<template>
  <div>
    <h2>Manage Numbers</h2>
    <b-form @submit.prevent="addNumber">
      <b-form-group label="Number" label-for="numberInput">
        <b-form-input
          id="numberInput"
          v-model="newNumber"
          placeholder="Enter WhatsApp number"
          required
        ></b-form-input>
      </b-form-group>
      <b-button type="submit" variant="primary">Add / Update Number</b-button>
    </b-form>

    <b-table striped hover :items="numbers" :fields="fields" class="mt-3">
      <template #cell(config)="data">
        <pre>{{ JSON.stringify(data.item.config, null, 2) }}</pre>
      </template>
    </b-table>
  </div>
</template>

<script>
import axios from 'axios';

export default {
  data() {
    return {
      newNumber: '',
      numbers: [],
      fields: [
        { key: 'id', label: 'ID' },
        { key: 'number', label: 'Number' },
        { key: 'config', label: 'Config' },
        { key: 'created_at', label: 'Created At' }
      ]
    };
  },
  methods: {
    async fetchNumbers() {
      try {
        const response = await axios.get('/numbers');
        this.numbers = response.data;
      } catch (error) {
        console.error('Error fetching numbers:', error);
      }
    },
    async addNumber() {
      if (!this.newNumber) return;
      try {
        await axios.post('/numbers', { number: this.newNumber });
        this.newNumber = '';
        this.fetchNumbers();
      } catch (error) {
        console.error('Error adding number:', error);
      }
    }
  },
  mounted() {
    this.fetchNumbers();
  }
};
</script>
