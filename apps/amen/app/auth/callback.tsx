import { useEffect } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase/client';

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const handleCallback = async () => {
      if (typeof window === 'undefined') return;

      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');

      if (accessToken && refreshToken && supabase) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (error) {
          console.error('Auth callback error:', error);
          router.replace('/');
          return;
        }

        router.replace('/maker');
      } else {
        router.replace('/');
      }
    };

    handleCallback();
  }, [router]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1F2937' }}>
      <ActivityIndicator size="large" color="#6366F1" />
      <Text style={{ color: '#FFFFFF', marginTop: 16 }}>Completing sign in...</Text>
    </View>
  );
}
