/**
 * Shared email utilities for Edge Functions
 * Supports Resend API for transactional emails
 */

import { ApiResponse } from './responses.ts';

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string;
  replyTo?: string;
}

export class EmailService {
  private apiKey: string;
  private defaultFrom: string;

  constructor(apiKey: string, defaultFrom: string = 'Clixen <notifications@clixen.app>') {
    this.apiKey = apiKey;
    this.defaultFrom = defaultFrom;
  }

  /**
   * Send email using Resend API
   */
  async send(options: EmailOptions): Promise<ApiResponse> {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: options.from || this.defaultFrom,
          to: options.to,
          subject: options.subject,
          html: options.html,
          text: options.text,
          reply_to: options.replyTo,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to send email');
      }

      const data = await response.json();
      return {
        success: true,
        data: { id: data.id, message: 'Email sent successfully' },
      };
    } catch (error) {
      console.error('Email send error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send email',
      };
    }
  }

  /**
   * Send weather notification email
   */
  async sendWeatherNotification(
    to: string,
    weatherData: any,
    city: string = 'Boston'
  ): Promise<ApiResponse> {
    const html = this.formatWeatherEmail(weatherData, city);
    
    return this.send({
      to,
      subject: `☀️ Your ${city} Weather Update - ${new Date().toLocaleDateString()}`,
      html,
      text: this.formatWeatherText(weatherData, city),
    });
  }

  /**
   * Format weather data as HTML email
   */
  private formatWeatherEmail(weather: any, city: string): string {
    const temp = Math.round(weather.main.temp);
    const feelsLike = Math.round(weather.main.feels_like);
    const description = weather.weather[0].description;
    const icon = weather.weather[0].icon;
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; }
          .content { background: #f7fafc; padding: 30px; border-radius: 0 0 10px 10px; }
          .weather-icon { font-size: 48px; margin: 20px 0; }
          .temp { font-size: 48px; font-weight: bold; color: #2d3748; }
          .details { margin: 20px 0; }
          .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e2e8f0; }
          .footer { text-align: center; margin-top: 30px; color: #718096; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0;">Good Morning! ☀️</h1>
            <p style="margin: 10px 0 0 0;">Your ${city} Weather Update</p>
          </div>
          <div class="content">
            <div style="text-align: center;">
              <img src="https://openweathermap.org/img/wn/${icon}@2x.png" alt="${description}" style="width: 100px;">
              <div class="temp">${temp}°F</div>
              <p style="font-size: 18px; color: #4a5568; text-transform: capitalize;">${description}</p>
            </div>
            
            <div class="details">
              <div class="detail-row">
                <span>🌡️ Feels Like</span>
                <strong>${feelsLike}°F</strong>
              </div>
              <div class="detail-row">
                <span>💧 Humidity</span>
                <strong>${weather.main.humidity}%</strong>
              </div>
              <div class="detail-row">
                <span>💨 Wind Speed</span>
                <strong>${Math.round(weather.wind.speed)} mph</strong>
              </div>
              <div class="detail-row">
                <span>🌅 Sunrise</span>
                <strong>${new Date(weather.sys.sunrise * 1000).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</strong>
              </div>
              <div class="detail-row">
                <span>🌇 Sunset</span>
                <strong>${new Date(weather.sys.sunset * 1000).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</strong>
              </div>
            </div>
            
            <div style="background: #edf2f7; padding: 15px; border-radius: 8px; margin-top: 20px;">
              <p style="margin: 0; color: #4a5568;">
                ${this.getWeatherAdvice(temp, weather.weather[0].main)}
              </p>
            </div>
          </div>
          <div class="footer">
            <p>Powered by Clixen Automation 🚀</p>
            <p>This is an automated weather update from your n8n workflow</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Format weather data as plain text
   */
  private formatWeatherText(weather: any, city: string): string {
    const temp = Math.round(weather.main.temp);
    const feelsLike = Math.round(weather.main.feels_like);
    const description = weather.weather[0].description;
    
    return `
Good Morning! Your ${city} Weather Update

Current Temperature: ${temp}°F
Feels Like: ${feelsLike}°F
Conditions: ${description}

Details:
- Humidity: ${weather.main.humidity}%
- Wind Speed: ${Math.round(weather.wind.speed)} mph
- Sunrise: ${new Date(weather.sys.sunrise * 1000).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
- Sunset: ${new Date(weather.sys.sunset * 1000).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}

${this.getWeatherAdvice(temp, weather.weather[0].main)}

--
Powered by Clixen Automation
    `.trim();
  }

  /**
   * Get weather-based advice
   */
  private getWeatherAdvice(temp: number, condition: string): string {
    if (condition.toLowerCase().includes('rain')) {
      return "🌂 Don't forget your umbrella today!";
    } else if (condition.toLowerCase().includes('snow')) {
      return "❄️ Bundle up and drive carefully!";
    } else if (temp > 85) {
      return "🌡️ It's going to be hot! Stay hydrated.";
    } else if (temp < 40) {
      return "🧥 It's chilly outside. Grab a warm jacket!";
    } else if (condition.toLowerCase().includes('clear')) {
      return "😎 Perfect weather! Enjoy your day!";
    } else {
      return "Have a wonderful day!";
    }
  }
}

// Export singleton instance
export const emailService = new EmailService(
  Deno.env.get('RESEND_API_KEY') || 're_eP6sgKMF_ELjbAvaFyFEsSbnj3pzFUJm2'
);