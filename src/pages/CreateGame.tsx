/* eslint-disable no-undef */
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { ArrowLeft } from 'lucide-react';
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

export default function CreateGame() {
  const navigate = useNavigate();
  const [gameName, setGameName] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [allowPlayersToReveal, setAllowPlayersToReveal] = useState(true);
  const [adminCanSpectate, setAdminCanSpectate] = useState(false);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();

    if (!playerName.trim()) {
      alert('Please enter your name');
      return;
    }

    const gameId = generateGameId();
    const settings = {
      gameName: gameName.trim() || 'Planning Poker',
      allowPlayersToReveal,
      adminCanSpectate,
    };

    // Navigate to game with state
    navigate(`/game/${gameId}`, {
      state: {
        playerName: playerName.trim(),
        isAdmin: true,
        settings,
      },
    });
  };

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
                    type="text"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    placeholder="Enter your name"
                    required
                  />
                </Field>
                <Field>
                  <div className="flex items-center">
                    <FieldLabel htmlFor="gameName">Game Name</FieldLabel>
                  </div>
                  <Input
                    id="gameName"
                    type="text"
                    value={gameName}
                    onChange={(e) => setGameName(e.target.value)}
                    placeholder="Leave blank for 'Planning Poker'"
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
                            checked={allowPlayersToReveal}
                            onCheckedChange={(checked) => setAllowPlayersToReveal(checked)}
                          />
                          <Label htmlFor="playerReveal">Allow All Players to Reveal Cards</Label>
                        </div>
                      </Field>
                      <Field>
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="spectatorMode"
                            checked={adminCanSpectate}
                            onCheckedChange={(checked) => setAdminCanSpectate(checked)}
                          />
                          <Label htmlFor="spectatorMode">Spectator Mode</Label>
                        </div>
                      </Field>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
                <Field>
                  <Button type="submit">Create Game</Button>
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
