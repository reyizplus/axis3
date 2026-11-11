'use client';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LogOut, User, Settings } from 'lucide-react';
import { signOut } from '@/lib/auth/actions/session';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface UserMenuProps {
  user: {
    email: string;
    full_name: string;
  };
}

export function UserMenu({ user }: UserMenuProps) {
  const router = useRouter();

  const handleSignOut = async () => {
    const result = await signOut();
    if (result.success) {
      toast.success('Başarıyla çıkış yapıldı');
      router.push('/login');
    } else {
      toast.error(result.error || 'Çıkış yapılırken bir hata oluştu');
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((word) => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center space-x-3 rounded-lg px-3 py-2 hover:bg-accent transition-colors">
        <Avatar className="h-8 w-8">
          <AvatarFallback className="bg-primary text-primary-foreground text-sm">
            {getInitials(user.full_name)}
          </AvatarFallback>
        </Avatar>
        <div className="flex flex-col items-start text-sm">
          <span className="font-medium">{user.full_name}</span>
          <span className="text-xs text-muted-foreground">{user.email}</span>
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Hesabım</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push('/dashboard')}>
          <User className="mr-2 h-4 w-4" />
          <span>Dashboard</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => router.push('/dashboard/settings')}>
          <Settings className="mr-2 h-4 w-4" />
          <span>Ayarlar</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
          <LogOut className="mr-2 h-4 w-4" />
          <span>Çıkış Yap</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
