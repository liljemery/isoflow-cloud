import React, { useState } from 'react';
import {
  Box,
  Button,
  Container,
  Link,
  Paper,
  TextField,
  Typography
} from '@mui/material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { apiRegister } from '../api';
import { useAuth } from '../authContext';

export function RegisterPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { token, user } = await apiRegister(email, password);
      login(token, user);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Paper sx={{ p: 4 }}>
        <Typography variant="h5" gutterBottom>
          Create account
        </Typography>
        <Box component="form" onSubmit={onSubmit} sx={{ mt: 2 }}>
          <TextField
            fullWidth
            label="Email"
            type="email"
            margin="normal"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
          <TextField
            fullWidth
            label="Password (min 8 characters)"
            type="password"
            margin="normal"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
            inputProps={{ minLength: 8 }}
          />
          {error ? (
            <Typography color="error" sx={{ mt: 1 }}>
              {error}
            </Typography>
          ) : null}
          <Button
            type="submit"
            variant="contained"
            fullWidth
            sx={{ mt: 2 }}
            disabled={loading}
          >
            {loading ? 'Creating…' : 'Register'}
          </Button>
          <Typography sx={{ mt: 2 }}>
            Already have an account?{' '}
            <Link component={RouterLink} to="/login">
              Sign in
            </Link>
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
}
