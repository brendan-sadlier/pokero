/* eslint-disable no-undef */
import { useCallback, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { ArrowLeft, LoaderCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '../components/ui/field';
import { Input } from '../components/ui/input';
import { generateGameId } from '../lib/utils';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '../components/ui/accordion';
import { Switch } from '../components/ui/switch';
import { Label } from '../components/ui/label';
import type { CreateGameFormData, CreateGameLocationState } from '../types';
import { toast } from 'sonner';

export default function CreateGame() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<CreateGameFormData>({
    playerName: '',
    gameName: '',
    allowPlayersToReveal: true,
    adminCanSpectate: false,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = useCallback(
    (field: keyof CreateGameFormData, value: string | boolean) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
    },
    [],
  );

  const validateForm = useCallback((): boolean => {
    if (!formData.playerName.trim()) {
      toast.error('Please enter your name');
      return false;
    }

    if (formData.playerName.length > 50) {
      toast.error('Name cannot exceed 50 characters');
      return false;
    }

    if (formData.gameName.length > 100) {
      toast.error('Game name cannot exceed 100 characters');
      return false;
    }

    return true;
  }, [formData]);

  const handleCreate = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();

      if (isSubmitting) return;

      if (!validateForm()) return;

      setIsSubmitting(true);

      try {
        const gameId = generateGameId().toLowerCase();
        const locationState: CreateGameLocationState = {
          playerName: formData.playerName.trim(),
          isAdmin: true,
          settings: {
            gameName: formData.gameName.trim() || 'Planning Poker',
            allowPlayersToReveal: formData.allowPlayersToReveal,
            adminCanSpectate: formData.adminCanSpectate,
          },
        };

        // Navigate to game with state
        navigate(`/game/${gameId}`, {
          state: locationState,
        });
      } catch (error) {
        console.error('Error creating game:', error);
        toast.error('Failed to create game. Please try again.');
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
            <CardTitle className="font-ruska text-pretty text-primary text-xl">
              Create a Game
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate}>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="playerName">Name</FieldLabel>
                  <Input
                    id="playerName"
                    name="playerName"
                    type="text"
                    value={formData.playerName}
                    onChange={(e) => handleInputChange('playerName', e.target.value)}
                    placeholder="Enter your Name"
                    required
                    maxLength={50}
                    disabled={isSubmitting}
                  />
                </Field>
                <Field>
                  <div className="flex items-center">
                    <FieldLabel htmlFor="gameName">Game Name</FieldLabel>
                  </div>
                  <Input
                    id="gameName"
                    name="gameName"
                    type="text"
                    value={formData.gameName}
                    onChange={(e) => handleInputChange('gameName', e.target.value)}
                    placeholder="Leave blank for 'Planning Poker'"
                    maxLength={100}
                    disabled={isSubmitting}
                  />
                </Field>
                <Accordion type="single" collapsible className="w-full px-2 ">
                  <AccordionItem value="item-1">
                    <AccordionTrigger>Game Settings</AccordionTrigger>
                    <AccordionContent className="flex flex-col gap-2">
                      <Field>
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="playerReveal"
                            checked={formData.allowPlayersToReveal}
                            onCheckedChange={(checked) =>
                              handleInputChange('allowPlayersToReveal', checked)
                            }
                            disabled={isSubmitting}
                          />
                          <Label htmlFor="playerReveal">Allow All Players to Reveal Cards</Label>
                        </div>
                      </Field>
                      <Field>
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="spectatorMode"
                            checked={formData.adminCanSpectate}
                            onCheckedChange={(checked) =>
                              handleInputChange('adminCanSpectate', checked)
                            }
                            disabled={isSubmitting}
                          />
                          <Label htmlFor="spectatorMode">Spectator Mode</Label>
                        </div>
                      </Field>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
                <Field>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <LoaderCircle className="animate-spin" /> Creating...
                      </>
                    ) : (
                      'Create Game'
                    )}
                  </Button>
                  <FieldDescription className="text-center">
                    Already have a game? <Link to="/join">Join a Game</Link>
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
