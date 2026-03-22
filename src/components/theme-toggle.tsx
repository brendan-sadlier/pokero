import { useTheme } from './theme-provider';
import { Button } from './ui/button';
import { IconMoon, IconSun } from '@tabler/icons-react';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <Button
      variant="ghost"
      className="group hover:cursor-pointer"
      size="icon"
      onClick={toggleTheme}
    >
      <IconSun className="h-[1.2rem] w-[1.2rem] scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90 group-hover:scale-110 dark:group-hover:scale-0" />
      <IconMoon className="absolute h-[1.2rem] w-[1.2rem] scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0 dark:group-hover:scale-110" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
