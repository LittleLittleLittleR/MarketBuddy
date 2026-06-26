import { Button } from '@/components/ui/button';
import type { RangeOption } from '@/types/candles';

const RANGES: RangeOption[] = ['1D', '1W', '1M', '1Y'];

interface RangeSelectorProps {
  active: RangeOption;
  onChange: (range: RangeOption) => void;
}

export function RangeSelector({ active, onChange }: RangeSelectorProps) {
  return (
    <div className="flex items-center gap-1">
      {RANGES.map((r) => (
        <Button
          key={r}
          variant="ghost"
          size="sm"
          onClick={() => onChange(r)}
          className={`
            h-7 px-3 text-xs font-mono font-medium tracking-wider rounded
            transition-all duration-150
            ${active === r
              ? 'bg-foreground text-background'
              : 'text-muted-foreground hover:text-foreground hover:bg-accent'
            }
          `}
        >
          {r}
        </Button>
      ))}
    </div>
  );
}
