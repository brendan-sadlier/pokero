/**
 * @fileoverview Create game page component.
 * Allows users to create new Pokero game sessions.
 */

import { useCallback, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { ArrowLeft, LoaderCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '../components/ui/field';
import { Input } from '../components/ui/input';
import { generateGameId, validateCreateGameForm } from '../lib/utils';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '../components/ui/accordion';
import { Switch } from '../components/ui/switch';
import { Label } from '../components/ui/label';
import {
  DEFAULT_GAME_SETTINGS,
  VALIDATION_CONFIG,
  VOTING_TYPE_LABELS,
  VotingType,
  type CreateGameFormData,
  type CreateGameLocationState,
} from '../types';
import { toast } from 'sonner';
import AnimatedBackground from '../components/animated-background';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';

/**
 * Page for creating a new game session.
 */
export default function CreateGame() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState<CreateGameFormData>({
    playerName: '',
    gameName: '',
    allowPlayersToReveal: DEFAULT_GAME_SETTINGS.allowPlayersToReveal,
    adminCanSpectate: DEFAULT_GAME_SETTINGS.adminCanSpectate,
    votingType: DEFAULT_GAME_SETTINGS.votingType,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  /**
   * Updates a form field value.
   */
  const handleInputChange = useCallback(
    <K extends keyof CreateGameFormData>(field: K, value: CreateGameFormData[K]) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
    },
    [],
  );

  /**
   * Handles form submission.
   */
  const handleCreate = useCallback(
    // eslint-disable-next-line no-undef
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();

      if (isSubmitting) return;

      const validation = validateCreateGameForm(formData.playerName, formData.gameName);

      if (!validation.isValid) {
        toast.error(validation.error);
        return;
      }

      setIsSubmitting(true);

      try {
        const gameId = generateGameId();
        const locationState: CreateGameLocationState = {
          playerName: formData.playerName.trim(),
          isAdmin: true,
          settings: {
            gameName: formData.gameName.trim() || DEFAULT_GAME_SETTINGS.gameName,
            allowPlayersToReveal: formData.allowPlayersToReveal,
            adminCanSpectate: formData.adminCanSpectate,
            votingType: formData.votingType,
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
                    maxLength={VALIDATION_CONFIG.MAX_NAME_LENGTH}
                    disabled={isSubmitting}
                    autoComplete="name"
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="gameName">Game Name</FieldLabel>
                  <Input
                    id="gameName"
                    name="gameName"
                    type="text"
                    value={formData.gameName}
                    onChange={(e) => handleInputChange('gameName', e.target.value)}
                    placeholder={`Leave blank for '${DEFAULT_GAME_SETTINGS.gameName}'`}
                    maxLength={VALIDATION_CONFIG.MAX_GAME_NAME_LENGTH}
                    disabled={isSubmitting}
                    autoComplete="off"
                  />
                </Field>

                {/* Voting Type Selection */}
                <Field>
                  <FieldLabel htmlFor="votingType">Voting Type</FieldLabel>
                  <Select
                    value={formData.votingType}
                    onValueChange={(value) => handleInputChange('votingType', value as VotingType)}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger id="votingType">
                      <SelectValue placeholder="Select voting type" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(VOTING_TYPE_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                {/* Advanced Game Settings Accordion */}
                <Accordion type="single" collapsible className="w-full px-2 ">
                  <AccordionItem value="settings">
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
                  <Button type="submit" disabled={isSubmitting} className="w-full">
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

      <AnimatedBackground />
    </div>
  );
}
