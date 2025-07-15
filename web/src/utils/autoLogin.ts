/**
 * Utility functions for automatic login when wallet is already registered
 */

export const checkMetaMaskAndAutoLogin = async (expectedRole: string, router?: any): Promise<boolean> => {
  try {
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      const accounts = await (window as any).ethereum.request({
        method: 'eth_accounts'
      });
      
      if (accounts && accounts.length > 0) {
        const walletAddress = accounts[0];
        console.log('🔍 Wallet conectada:', walletAddress);
        
        // Verificar si esta wallet está registrada con el rol esperado
        const response = await fetch(`/api/registration/status/${walletAddress}`);
        if (response.ok) {
          const data = await response.json();
          
          console.log('🔍 Respuesta de verificación de usuario:', data);
          
          // El endpoint devuelve data.profile.role, no data.user.role
          console.log('🔍 Comparando roles:', {
            profileRole: data.profile?.role,
            expectedRole,
            profileRoleLower: data.profile?.role?.toLowerCase(),
            expectedRoleLower: expectedRole.toLowerCase(),
            match: data.profile?.role?.toLowerCase() === expectedRole.toLowerCase()
          });
          
          if (data.success && data.profile && data.profile.role?.toLowerCase() === expectedRole.toLowerCase()) {
            console.log(`✅ Usuario registrado como ${expectedRole}, haciendo auto-login...`);
            
            // Hacer login automático
            const loginResponse = await fetch('/api/auth/login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ role: expectedRole })
            });
            
            if (loginResponse.ok) {
              const loginData = await loginResponse.json();
              if (loginData.success) {
                // Guardar datos de autenticación
                localStorage.setItem('authToken', loginData.data.token);
                localStorage.setItem('authUser', JSON.stringify(loginData.data.user));
                localStorage.setItem('userRole', expectedRole);
                
                // Recargar la página para aplicar cambios
                window.location.reload();
                return true;
              }
            } else {
              console.log(`❌ Usuario no registrado como ${expectedRole}`);
              if (router) {
                router.push(`/auth?role=${expectedRole}`);
                return true; // Return true to prevent further redirect
              }
            }
          } else {
            console.log('❌ Error verificando estado del usuario');
            if (router) {
              router.push(`/auth?role=${expectedRole}`);
              return true;
            }
          }
        }
      } else {
        console.log('❌ No hay wallet conectada');
        if (router) {
          router.push(`/auth?role=${expectedRole}`);
          return true;
        }
      }
    }
  } catch (error) {
    console.log('⚠️ Error verificando wallet:', error);
    if (router) {
      router.push(`/auth?role=${expectedRole}`);
      return true;
    }
  }
  
  return false;
};