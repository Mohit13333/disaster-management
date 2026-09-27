import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { ErrorMessage } from '../components/ErrorMessage';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: unknown) {
      const msg =
        err instanceof Error && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      setError(msg ?? 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">🚨</div>
          <h1 className="text-2xl font-bold text-gray-100">Disaster Response Platform</h1>
          <p className="text-gray-400 mt-2">Sign in to coordinate disaster response</p>
        </div>

        {/* Form card */}
        <div className="rounded-2xl border border-gray-800 bg-gray-900 p-8">
          <form id="login-form" onSubmit={handleSubmit} className="flex flex-col gap-5">
            <Input
              id="email-input"
              label="Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@example.com"
              required
              autoFocus
            />

            <Input
              id="password-input"
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />

            {error && <ErrorMessage message={error} />}

            <Button
              id="login-btn"
              type="submit"
              size="lg"
              isLoading={isLoading}
              className="w-full mt-2"
            >
              Sign In
            </Button>
          </form>
        </div>

        {/* Demo credentials */}
        <div className="mt-6 rounded-xl border border-gray-800 bg-gray-900/50 p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Development Credentials
          </p>
          <div className="space-y-2">
            <button
              onClick={() => { setEmail('admin@example.com'); setPassword('admin123'); }}
              className="w-full text-left text-xs text-gray-400 hover:text-gray-200 p-2 rounded-lg hover:bg-gray-800 transition-colors"
            >
              <span className="text-purple-400 font-medium">Admin:</span> admin@example.com / admin123
            </button>
            <button
              onClick={() => { setEmail('contributor@example.com'); setPassword('contributor123'); }}
              className="w-full text-left text-xs text-gray-400 hover:text-gray-200 p-2 rounded-lg hover:bg-gray-800 transition-colors"
            >
              <span className="text-blue-400 font-medium">Contributor:</span> contributor@example.com / contributor123
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
