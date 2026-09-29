class NotificationProvider {
  constructor(name) {
    this.name = name;
  }

  async sendAlert(alertData) {
    throw new Error('sendAlert() must be implemented by subclass');
  }

  isConfigured() {
    throw new Error('isConfigured() must be implemented by subclass');
  }
}

module.exports = NotificationProvider;
