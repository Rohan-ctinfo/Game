import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { login, register } from '../../services/api/auth.api';
import { useAuthStore } from '../../store/auth.store';

const loginSchema = z.object({
  email: z.string().email('Enter valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters')
});

const registerSchema = loginSchema.extend({
  username: z.string().min(3, 'Username min 3 chars').max(32, 'Username max 32 chars')
});

export default function AuthPage() {
  const [mode, setMode] = useState('login');
  const nav = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  const schema = useMemo(() => (mode === 'login' ? loginSchema : registerSchema), [mode]);

  const { register: bind, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { username: '', email: '', password: '' }
  });

  const submit = async (values) => {
    try {
      const out = mode === 'login' ? await login(values) : await register(values);
      setAuth({ userId: out.userId, username: out.username, accessToken: out.accessToken });
      toast.success(mode === 'login' ? 'Login successful' : 'Account created and logged in');
      nav('/dashboard', { replace: true });
    } catch (err) {
      toast.error(err.message || 'Authentication failed');
    }
  };

  const switchMode = () => {
    setMode((m) => (m === 'login' ? 'register' : 'login'));
    reset({ username: '', email: '', password: '' });
  };

  return (
    <div className="auth-shell">
      <div className="auth-panel">
        <h1>{mode === 'login' ? 'Welcome Back' : 'Create Account'}</h1>
        <p>Play realtime multiplayer games with room codes.</p>

        <form onSubmit={handleSubmit(submit)}>
          {mode === 'register' && (
            <>
              <input placeholder="Username" {...bind('username')} />
              {errors.username && <small className="error">{errors.username.message}</small>}
            </>
          )}

          <input placeholder="Email" {...bind('email')} />
          {errors.email && <small className="error">{errors.email.message}</small>}

          <input type="password" placeholder="Password" {...bind('password')} />
          {errors.password && <small className="error">{errors.password.message}</small>}

          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Please wait...' : mode === 'login' ? 'Login' : 'Sign up'}
          </button>
        </form>

        <button className="link" onClick={switchMode}>
          {mode === 'login' ? 'Create new account' : 'Already have an account'}
        </button>
      </div>
    </div>
  );
}
