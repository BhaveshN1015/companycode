'use client';

import { useCallback, useRef, useState } from 'react';
import { FaMicrophone, FaStop } from 'react-icons/fa';
import { useLanguage } from '@/context/LanguageContext';
import { useVoiceEngineContext } from '@/components/VoiceEngineProvider';

interface VoiceFieldInputProps {
  onTranscript: (text: string) => void;
  disabled?: boolean;
  className?: string;
}

export default function VoiceFieldInput({
  onTranscript,
  disabled = false,
  className = '',
}: VoiceFieldInputProps) {
  const { langCode } = useLanguage();
  const voice = useVoiceEngineContext();
  const [isListening, setIsListening] = useState(false);

  const handleClick = useCallback(() => {
    if (disabled || !voice.ready) return;
    if (isListening) {
      voice.stopListening();
      setIsListening(false);
    } else {
      setIsListening(true);
      voice.startListening((result) => {
        onTranscript(result.original);
        setIsListening(false);
      });
    }
  }, [disabled, voice, isListening, onTranscript]);

  if (!voice.sttSupported) return null;

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || !voice.ready}
      aria-label={isListening ? 'Stop listening' : 'Start voice input'}
      title={isListening ? 'Stop' : 'Speak'}
      className={`flex h-8 w-8 items-center justify-center rounded-lg transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 disabled:opacity-40 ${
        isListening
          ? 'bg-red-500 text-white animate-pulse'
          : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
      } ${className}`}
    >
      {isListening
        ? <FaStop size={10} aria-hidden="true" />
        : <FaMicrophone size={10} aria-hidden="true" />}
    </button>
  );
}
