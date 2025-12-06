/**
 * @fileoverview Join game page component.
 * Allows users to join existing Pokero game sessions.
 */

import { useCallback, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '../components/ui/field';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { VALIDATION_CONFIG, type JoinGameFormData, type JoinGameLocationState } from '../types';
import { toast } from 'sonner';
import { normalizeGameId, validateJoinGameForm } from '../lib/utils';
import { AnimatedBackground } from '../components/animated-background';

/**
 * Page for joining an existing game session.
 */
export default function JoinGame() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Pre-fill game ID from URL if provided
  const [formData, setFormData] = useState<JoinGameFormData>({
    playerName: '',
    gameId: normalizeGameId(searchParams.get('gameId') || ''),
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  /**
   * Updates a form field value.
   */
  const handleInputChange = useCallback((field: keyof JoinGameFormData, value: string) => {
    const processedValue = field === 'gameId' ? normalizeGameId(value) : value;
    setFormData((prev) => ({ ...prev, [field]: processedValue }));
  }, []);

  /**
   * Handles form submission.
   */
  const handleJoin = useCallback(
    // eslint-disable-next-line no-undef
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();

      if (isSubmitting) return;

      const validation = validateJoinGameForm(formData.playerName, formData.gameId);
      if (!validation.isValid) {
        toast.error(validation.error);
        return;
      }

      setIsSubmitting(true);

      try {
        const normalizedGameId = normalizeGameId(formData.gameId);

        const locationState: JoinGameLocationState = {
          playerName: formData.playerName.trim(),
          isAdmin: false,
        };

        navigate(`/game/${normalizedGameId}`, {
          state: locationState,
        });
      } catch (error) {
        console.error('Error joining game:', error);
        toast.error('Failed to join the game. Please try again.');
        setIsSubmitting(false);
      }
    },
    [formData, isSubmitting, navigate],
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
            <CardTitle className="font-ruska text-pretty text-primary text-xl">
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
                    placeholder="Enter your Name"
                    required
                    maxLength={VALIDATION_CONFIG.MAX_NAME_LENGTH}
                    disabled={isSubmitting}
                    autoComplete="name"
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="gameId">Game ID</FieldLabel>
                  <Input
                    id="gameId"
                    name="gameId"
                    type="text"
                    value={formData.gameId}
                    onChange={(e) => handleInputChange('gameId', e.target.value)}
                    placeholder="Enter Game ID"
                    required
                    disabled={isSubmitting}
                    autoComplete="off"
                  />
                  <FieldDescription className="text-xs text-muted-foreground">
                    Game IDs are case-insensitive
                  </FieldDescription>
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
      <AnimatedBackground />
    </div>
  );
}
