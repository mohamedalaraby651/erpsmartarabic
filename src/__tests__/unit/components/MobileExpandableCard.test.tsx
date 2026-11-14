import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MobileExpandableCard } from '@/components/ui/data/MobileExpandableCard';

describe('MobileExpandableCard', () => {
  it('hides details until expanded', () => {
    render(<MobileExpandableCard title="عميل أ" details={[{ label: 'الهاتف', value: '010' }]} />);
    expect(screen.queryByText('الهاتف')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'عرض التفاصيل' }));
    expect(screen.getByText('الهاتف')).toBeTruthy();
  });
});
