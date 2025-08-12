import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { emailService } from '../_shared/email.ts';
import { corsHeaders } from '../_shared/cors.ts';

const OPENWEATHER_API_KEY = Deno.env.get('OPENWEATHER_API_KEY') || 'bd5e378503939ddaee76f12ad7a97608'; // Free tier key for testing
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface WeatherEmailRequest {
  email?: string;
  city?: string;
  userId?: string;
  testMode?: boolean;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { email, city = 'Boston', userId, testMode = false } = await req.json() as WeatherEmailRequest;
    
    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // If no email provided, try to get from userId
    let recipientEmail = email;
    if (!recipientEmail && userId) {
      const { data: user, error } = await supabase
        .from('users')
        .select('email')
        .eq('id', userId)
        .single();
      
      if (error || !user) {
        throw new Error('User not found');
      }
      recipientEmail = user.email;
    }
    
    if (!recipientEmail) {
      throw new Error('Email address required');
    }
    
    // Fetch weather data from OpenWeatherMap
    const weatherResponse = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${OPENWEATHER_API_KEY}&units=imperial`
    );
    
    if (!weatherResponse.ok) {
      throw new Error('Failed to fetch weather data');
    }
    
    const weatherData = await weatherResponse.json();
    
    // Send email using Resend
    const emailResult = await emailService.sendWeatherNotification(
      recipientEmail,
      weatherData,
      city
    );
    
    if (!emailResult.success) {
      throw new Error(emailResult.error || 'Failed to send email');
    }
    
    // Log the email send (optional)
    if (!testMode) {
      await supabase
        .from('email_logs')
        .insert({
          recipient: recipientEmail,
          type: 'weather_notification',
          city: city,
          status: 'sent',
          metadata: {
            weather: weatherData.weather[0].description,
            temp: weatherData.main.temp
          }
        });
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        message: `Weather email sent to ${recipientEmail}`,
        data: {
          recipient: recipientEmail,
          city: city,
          weather: weatherData.weather[0].description,
          temperature: Math.round(weatherData.main.temp) + '°F'
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );
    
  } catch (error) {
    console.error('Error in send-weather-email:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send weather email'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    );
  }
});