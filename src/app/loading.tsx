import Image from 'next/image';

export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-6">
        <Image
          src="/navbar-logo.png"
          alt="AXIS3"
          width={110}
          height={36}
          priority
          className="h-9 w-auto object-contain opacity-80"
        />
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-primary animate-bounce [animation-delay:0ms]" />
          <div className="h-2 w-2 rounded-full bg-primary animate-bounce [animation-delay:150ms]" />
          <div className="h-2 w-2 rounded-full bg-primary animate-bounce [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  );
}
