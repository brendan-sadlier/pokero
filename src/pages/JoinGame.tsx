/* eslint-disable no-undef */
import { useCallback, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '../components/ui/field';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import type { JoinGameFormData, JoinGameLocationState } from '../types';
import { toast } from 'sonner';

export default function JoinGame() {
  const navigate = useNavigate();

  const [searchParams] = useSearchParams();

  const [formData, setFormData] = useState<JoinGameFormData>({
    playerName: '',
    gameId: searchParams.get('gameId') || '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = useCallback((field: keyof JoinGameFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const validateForm = useCallback((): boolean => {
    if (!formData.playerName.trim()) {
      toast.error('Please enter your name');
      return false;
    }

    if (formData.playerName.length > 50) {
      toast.error('Name cannot exceed 50 characters');
      return false;
    }

    if (!formData.gameId.trim()) {
      toast.error('Please enter a valid Game ID');
      return false;
    }

    // Basic Game ID format check (alphanumeric, reasonable length)
    const gameIdPattern = /^[a-z0-9]{5,15}$/;
    if (!gameIdPattern.test(formData.gameId.trim())) {
      toast.error('Invalid Game ID format');
      return false;
    }
    return true;
  }, [formData]);

  const handleJoin = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();

      if (isSubmitting) return;

      if (!validateForm()) return;

      setIsSubmitting(true);

      try {
        const locationState: JoinGameLocationState = {
          playerName: formData.playerName.trim(),
          isAdmin: false,
        };

        navigate(`/game/${formData.gameId.trim()}`, {
          state: locationState,
        });
      } catch (error) {
        console.error('Error joining game:', error);
        toast.error('Failed to join the game. Please try again.');
        setIsSubmitting(false);
      }
    },
    [formData, isSubmitting, navigate, validateForm],
  );

  return (
    <div className="relative flex items-center justify-center min-h-screen w-screen bg-background overflow-hidden">
      <Button
        asChild
        variant="link"
        className="absolute top-4 left-4 z-20 flex items-center gap-2 hover:font-semibold"
      >
        <Link to="/">
          <ArrowLeft className="w-5 h-5" />
          Back to Home
        </Link>
      </Button>

      <div className="relative z-10 w-full max-w-sm flex flex-col gap-6">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="font-display text-pretty text-primary text-xl">
              Join a Game
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleJoin}>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="name">Name</FieldLabel>
                  <Input
                    id="playerName"
                    name="playerName"
                    type="text"
                    value={formData.playerName}
                    onChange={(e) => handleInputChange('playerName', e.target.value)}
                    placeholder="Enter your name"
                    required
                    maxLength={50}
                    disabled={isSubmitting}
                  />
                </Field>
                <Field>
                  <div className="flex items-center">
                    <FieldLabel htmlFor="gameId">Game ID</FieldLabel>
                  </div>
                  <Input
                    id="gameId"
                    name="gameId"
                    type="text"
                    value={formData.gameId}
                    onChange={(e) => handleInputChange('gameId', e.target.value)}
                    placeholder="Enter Game ID"
                    required
                    disabled={isSubmitting}
                  />
                </Field>
                <Field>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="animate-spin" /> Joining...
                      </>
                    ) : (
                      'Join Game'
                    )}
                  </Button>
                  <FieldDescription className="text-center">
                    Don&apos;t have a Game ID? <Link to="/create">Create a Game</Link>
                  </FieldDescription>
                </Field>
              </FieldGroup>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute -top-1/2 -left-1/2 w-full h-full bg-primary/10 dark:bg-primary/20 rounded-full"
          animate={{ scale: [1, 1.1, 1], rotate: [0, 90, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
        />
        <motion.div
          className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-secondary/10 dark:bg-secondary/20 rounded-full"
          animate={{ scale: [1, 1.2, 1], rotate: [0, -90, 0] }}
          transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
        />
        <motion.div
          className="absolute top-1/4 left-1/4 w-12 h-12 bg-primary/20 dark:bg-primary/30 rounded-full"
          animate={{ y: [0, -20, 0], x: [0, 20, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute bottom-1/4 right-1/4 w-8 h-8 bg-secondary/20 dark:bg-secondary/30 rounded-full"
          animate={{ y: [0, 30, 0], x: [0, -30, 0] }}
          transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>
    </div>
  );
}
