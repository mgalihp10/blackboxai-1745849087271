<template>
  <div>
    <h2>Send and View Messages</h2>
    <b-form @submit.prevent="sendMessage">
      <b-form-group label="From Number" label-for="fromNumberInput">
        <b-form-select
          id="fromNumberInput"
          v-model="fromNumber"
          :options="numberOptions"
          required
        ></b-form-select>
      </b-form-group>

      <b-form-group label="To Number" label-for="toNumberInput">
        <b-form-input
          id="toNumberInput"
          v-model="toNumber"
          placeholder="Enter recipient number"
          required
        ></b-form-input>
      </b-form-group>

      <b-form-group label="Message" label-for="messageInput">
        <b-form-textarea
          id="messageInput"
          v-model="message"
          placeholder="Enter message"
          rows="3"
          required
        ></b-form-textarea>
      </b-form-group>

      <b-button type="submit" variant="primary">Send Message</b-button>
    </b-form>

    <b-table striped hover :items="messages" :fields="fields" class="mt-3">
      <template #cell(direction)="data">
        <span :class="{'text-success': data.item.direction === 'outbound', 'text-danger': data.item.direction === 'inbound'}">
          {{ data.item.direction }}
        </span>
      </template>
    </b-table>
  </div>
</template>

<script>
import axios from 'axios';

export default {
  data() {
    return {
      fromNumber: null,
      toNumber: '',
      message: '',
      numbers: [],
      messages: [],
      fields: [
        { key: 'id', label: 'ID' },
        { key: 'from_number', label: 'From' },
        { key: 'to_number', label: 'To' },
        { key: 'message', label: 'Message' },
        { key: 'direction', label: 'Direction' },
        { key: 'created_at', label: 'Created At' }
      ]
    };
  },
  computed: {
    numberOptions() {
      return this.numbers.map(n => ({ value: n.number, text: n.number }));
    }
  },
  methods: {
    async fetchNumbers() {
      try {
        const response = await axios.get('/numbers');
        this.numbers = response.data;
        if (!this.fromNumber && this.numbers.length > 0) {
          this.fromNumber = this.numbers[0].number;
        }
      } catch (error) {
        console.error('Error fetching numbers:', error);
      }
    },
    async fetchMessages() {
      try {
        const response = await axios.get('/messages', {
          params: { number_id: this.numbers.find(n => n.number === this.fromNumber)?.id }
        });
        this.messages = response.data;
      } catch (error) {
        console.error('Error fetching messages:', error);
      }
    },
    async sendMessage() {
      if (!this.fromNumber || !this.toNumber || !this.message) return;
      try {
        // Send message via API gateway
        await axios.post('/send', {
          number: this.fromNumber,
          to: this.toNumber,
          message: this.message
        });

        // Save message to DB as outbound
        const numberId = this.numbers.find(n => n.number === this.fromNumber)?.id;
        if (numberId) {
          await axios.post('/messages', {
            number_id: numberId,
            from_number: this.fromNumber,
            to_number: this.toNumber,
            message: this.message,
            direction: 'outbound'
          });
        }

        this.message = '';
        this.fetchMessages();
      } catch (error) {
        console.error('Error sending message:', error);
      }
    }
  },
  watch: {
    fromNumber(newVal) {
      this.fetchMessages();
    }
  },
  mounted() {
    this.fetchNumbers();
  }
};
</script>
