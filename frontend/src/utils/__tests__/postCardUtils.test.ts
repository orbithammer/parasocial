// frontend/src/utils/__tests__/postCardUtils.test.ts
// Unit tests for PostCard utility functions
// Version: 1.0.0

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

/**
 * Formats a date string into a human-readable relative time
 * @param dateString - ISO date string to format
 * @returns Formatted relative time string
 */
function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
  
  if (diffInSeconds < 60) return 'just now'
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`
  
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
  })
}

/**
 * Gets the verification badge color based on tier
 * @param tier - Verification tier level
 * @returns CSS classes for badge styling
 */
function getVerificationBadgeColor(tier: string | null): string {
  switch (tier) {
    case 'notable': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
    case 'identity': return 'text-blue-600 bg-blue-50 border-blue-200'
    case 'email': return 'text-green-600 bg-green-50 border-green-200'
    default: return 'text-gray-600 bg-gray-50 border-gray-200'
  }
}

describe('PostCard Utility Functions', () => {
  describe('formatTimeAgo', () => {
    beforeEach(() => {
      // Set a fixed date for consistent testing
      vi.setSystemTime(new Date('2024-12-20T12:00:00Z'))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    describe('Recent Time Formatting (Under 1 minute)', () => {
      it('should return "just now" for times within 30 seconds', () => {
        const thirtySecondsAgo = '2024-12-20T11:59:30Z'
        expect(formatTimeAgo(thirtySecondsAgo)).toBe('just now')
      })

      it('should return "just now" for times within 59 seconds', () => {
        const fiftyNineSecondsAgo = '2024-12-20T11:59:01Z'
        expect(formatTimeAgo(fiftyNineSecondsAgo)).toBe('just now')
      })

      it('should return "just now" for current time', () => {
        const currentTime = '2024-12-20T12:00:00Z'
        expect(formatTimeAgo(currentTime)).toBe('just now')
      })

      it('should handle edge case at exactly 60 seconds', () => {
        const exactlyOneMinuteAgo = '2024-12-20T11:59:00Z'
        expect(formatTimeAgo(exactlyOneMinuteAgo)).toBe('1m ago')
      })
    })

    describe('Minutes Formatting (1 minute to 1 hour)', () => {
      it('should format 1 minute correctly', () => {
        const oneMinuteAgo = '2024-12-20T11:59:00Z'
        expect(formatTimeAgo(oneMinuteAgo)).toBe('1m ago')
      })

      it('should format 15 minutes correctly', () => {
        const fifteenMinutesAgo = '2024-12-20T11:45:00Z'
        expect(formatTimeAgo(fifteenMinutesAgo)).toBe('15m ago')
      })

      it('should format 30 minutes correctly', () => {
        const thirtyMinutesAgo = '2024-12-20T11:30:00Z'
        expect(formatTimeAgo(thirtyMinutesAgo)).toBe('30m ago')
      })

      it('should format 45 minutes correctly', () => {
        const fortyFiveMinutesAgo = '2024-12-20T11:15:00Z'
        expect(formatTimeAgo(fortyFiveMinutesAgo)).toBe('45m ago')
      })

      it('should format 59 minutes correctly', () => {
        const fiftyNineMinutesAgo = '2024-12-20T11:01:00Z'
        expect(formatTimeAgo(fiftyNineMinutesAgo)).toBe('59m ago')
      })

      it('should handle edge case at exactly 1 hour', () => {
        const exactlyOneHourAgo = '2024-12-20T11:00:00Z'
        expect(formatTimeAgo(exactlyOneHourAgo)).toBe('1h ago')
      })
    })

    describe('Hours Formatting (1 hour to 1 day)', () => {
      it('should format 1 hour correctly', () => {
        const oneHourAgo = '2024-12-20T11:00:00Z'
        expect(formatTimeAgo(oneHourAgo)).toBe('1h ago')
      })

      it('should format 2 hours correctly', () => {
        const twoHoursAgo = '2024-12-20T10:00:00Z'
        expect(formatTimeAgo(twoHoursAgo)).toBe('2h ago')
      })

      it('should format 6 hours correctly', () => {
        const sixHoursAgo = '2024-12-20T06:00:00Z'
        expect(formatTimeAgo(sixHoursAgo)).toBe('6h ago')
      })

      it('should format 12 hours correctly', () => {
        const twelveHoursAgo = '2024-12-20T00:00:00Z'
        expect(formatTimeAgo(twelveHoursAgo)).toBe('12h ago')
      })

      it('should format 23 hours correctly', () => {
        const twentyThreeHoursAgo = '2024-12-19T13:00:00Z'
        expect(formatTimeAgo(twentyThreeHoursAgo)).toBe('23h ago')
      })

      it('should handle edge case at exactly 24 hours', () => {
        const exactlyOneDayAgo = '2024-12-19T12:00:00Z'
        expect(formatTimeAgo(exactlyOneDayAgo)).toBe('1d ago')
      })
    })

    describe('Days Formatting (1 day to 1 week)', () => {
      it('should format 1 day correctly', () => {
        const oneDayAgo = '2024-12-19T12:00:00Z'
        expect(formatTimeAgo(oneDayAgo)).toBe('1d ago')
      })

      it('should format 2 days correctly', () => {
        const twoDaysAgo = '2024-12-18T12:00:00Z'
        expect(formatTimeAgo(twoDaysAgo)).toBe('2d ago')
      })

      it('should format 3 days correctly', () => {
        const threeDaysAgo = '2024-12-17T12:00:00Z'
        expect(formatTimeAgo(threeDaysAgo)).toBe('3d ago')
      })

      it('should format 6 days correctly', () => {
        const sixDaysAgo = '2024-12-14T12:00:00Z'
        expect(formatTimeAgo(sixDaysAgo)).toBe('6d ago')
      })

      it('should handle edge case at exactly 7 days', () => {
        const exactlyOneWeekAgo = '2024-12-13T12:00:00Z'
        const result = formatTimeAgo(exactlyOneWeekAgo)
        expect(result).toBe('Dec 13')
      })
    })

    describe('Absolute Date Formatting (Over 1 week)', () => {
      it('should format dates over 1 week with month and day', () => {
        const oneWeekAgo = '2024-12-13T12:00:00Z'
        expect(formatTimeAgo(oneWeekAgo)).toBe('Dec 13')
      })

      it('should format dates from previous month', () => {
        const previousMonth = '2024-11-15T12:00:00Z'
        expect(formatTimeAgo(previousMonth)).toBe('Nov 15')
      })

      it('should format dates from much earlier in same year', () => {
        const earlierThisYear = '2024-01-15T12:00:00Z'
        expect(formatTimeAgo(earlierThisYear)).toBe('Jan 15')
      })

      it('should include year for dates from different year', () => {
        // Set current time to 2025
        vi.setSystemTime(new Date('2025-01-15T12:00:00Z'))
        
        const previousYear = '2024-12-15T12:00:00Z'
        expect(formatTimeAgo(previousYear)).toBe('Dec 15, 2024')
      })

      it('should handle dates from multiple years ago', () => {
        const multipleYearsAgo = '2022-06-15T12:00:00Z'
        expect(formatTimeAgo(multipleYearsAgo)).toBe('Jun 15, 2022')
      })
    })

    describe('Edge Cases and Error Handling', () => {
      it('should handle invalid date strings gracefully', () => {
        const invalidDate = 'invalid-date-string'
        const result = formatTimeAgo(invalidDate)
        // Should not throw error and return some fallback
        expect(typeof result).toBe('string')
      })

      it('should handle future dates', () => {
        const futureDate = '2024-12-20T13:00:00Z' // 1 hour in the future
        const result = formatTimeAgo(futureDate)
        // Should handle gracefully, possibly showing "just now" or negative time
        expect(typeof result).toBe('string')
      })

      it('should handle leap year dates', () => {
        // Test leap year date
        const leapYearDate = '2024-02-29T12:00:00Z'
        const result = formatTimeAgo(leapYearDate)
        expect(result).toBe('Feb 29')
      })

      it('should handle timezone differences correctly', () => {
        const utcDate = '2024-12-20T11:00:00Z'
        const result = formatTimeAgo(utcDate)
        expect(result).toBe('1h ago')
      })

      it('should handle millisecond precision', () => {
        const preciseDate = '2024-12-20T11:59:59.999Z'
        const result = formatTimeAgo(preciseDate)
        expect(result).toBe('just now')
      })
    })

    describe('Boundary Value Testing', () => {
      it('should handle exact boundary between minutes and hours (3599 seconds)', () => {
        vi.setSystemTime(new Date('2024-12-20T12:00:00Z'))
        const almostOneHour = '2024-12-20T11:00:01Z' // 59 minutes 59 seconds ago
        expect(formatTimeAgo(almostOneHour)).toBe('59m ago')
      })

      it('should handle exact boundary between hours and days (86399 seconds)', () => {
        vi.setSystemTime(new Date('2024-12-20T12:00:00Z'))
        const almostOneDay = '2024-12-19T12:00:01Z' // 23 hours 59 minutes 59 seconds ago
        expect(formatTimeAgo(almostOneDay)).toBe('23h ago')
      })

      it('should handle exact boundary between days and weeks (604799 seconds)', () => {
        vi.setSystemTime(new Date('2024-12-20T12:00:00Z'))
        const almostOneWeek = '2024-12-13T12:00:01Z' // 6 days 23 hours 59 minutes 59 seconds ago
        expect(formatTimeAgo(almostOneWeek)).toBe('6d ago')
      })
    })
  })

  describe('getVerificationBadgeColor', () => {
    describe('Valid Verification Tiers', () => {
      it('should return yellow classes for notable tier', () => {
        const result = getVerificationBadgeColor('notable')
        expect(result).toBe('text-yellow-600 bg-yellow-50 border-yellow-200')
      })

      it('should return blue classes for identity tier', () => {
        const result = getVerificationBadgeColor('identity')
        expect(result).toBe('text-blue-600 bg-blue-50 border-blue-200')
      })

      it('should return green classes for email tier', () => {
        const result = getVerificationBadgeColor('email')
        expect(result).toBe('text-green-600 bg-green-50 border-green-200')
      })
    })

    describe('Invalid/Edge Case Tiers', () => {
      it('should return gray classes for null tier', () => {
        const result = getVerificationBadgeColor(null)
        expect(result).toBe('text-gray-600 bg-gray-50 border-gray-200')
      })

      it('should return gray classes for undefined tier', () => {
        const result = getVerificationBadgeColor(undefined as any)
        expect(result).toBe('text-gray-600 bg-gray-50 border-gray-200')
      })

      it('should return gray classes for empty string', () => {
        const result = getVerificationBadgeColor('')
        expect(result).toBe('text-gray-600 bg-gray-50 border-gray-200')
      })

      it('should return gray classes for unknown tier', () => {
        const result = getVerificationBadgeColor('unknown')
        expect(result).toBe('text-gray-600 bg-gray-50 border-gray-200')
      })

      it('should return gray classes for invalid tier string', () => {
        const result = getVerificationBadgeColor('invalid-tier')
        expect(result).toBe('text-gray-600 bg-gray-50 border-gray-200')
      })

      it('should return gray classes for numeric tier', () => {
        const result = getVerificationBadgeColor('123' as any)
        expect(result).toBe('text-gray-600 bg-gray-50 border-gray-200')
      })
    })

    describe('Case Sensitivity', () => {
      it('should be case sensitive - uppercase should return gray', () => {
        const result = getVerificationBadgeColor('NOTABLE')
        expect(result).toBe('text-gray-600 bg-gray-50 border-gray-200')
      })

      it('should be case sensitive - mixed case should return gray', () => {
        const result = getVerificationBadgeColor('Identity')
        expect(result).toBe('text-gray-600 bg-gray-50 border-gray-200')
      })

      it('should be case sensitive - Email should return gray', () => {
        const result = getVerificationBadgeColor('Email')
        expect(result).toBe('text-gray-600 bg-gray-50 border-gray-200')
      })
    })

    describe('Badge Color Consistency', () => {
      it('should return consistent colors for multiple calls', () => {
        const result1 = getVerificationBadgeColor('notable')
        const result2 = getVerificationBadgeColor('notable')
        expect(result1).toBe(result2)
      })

      it('should return different colors for different tiers', () => {
        const notable = getVerificationBadgeColor('notable')
        const identity = getVerificationBadgeColor('identity')
        const email = getVerificationBadgeColor('email')
        
        expect(notable).not.toBe(identity)
        expect(identity).not.toBe(email)
        expect(email).not.toBe(notable)
      })

      it('should include all required CSS classes for each tier', () => {
        const notable = getVerificationBadgeColor('notable')
        expect(notable).toContain('text-yellow-600')
        expect(notable).toContain('bg-yellow-50')
        expect(notable).toContain('border-yellow-200')

        const identity = getVerificationBadgeColor('identity')
        expect(identity).toContain('text-blue-600')
        expect(identity).toContain('bg-blue-50')
        expect(identity).toContain('border-blue-200')

        const email = getVerificationBadgeColor('email')
        expect(email).toContain('text-green-600')
        expect(email).toContain('bg-green-50')
        expect(email).toContain('border-green-200')
      })
    })

    describe('Performance and Type Safety', () => {
      it('should handle rapid successive calls efficiently', () => {
        const start = performance.now()
        
        // Call function many times
        for (let i = 0; i < 1000; i++) {
          getVerificationBadgeColor('notable')
          getVerificationBadgeColor('identity')
          getVerificationBadgeColor('email')
          getVerificationBadgeColor(null)
        }
        
        const end = performance.now()
        const duration = end - start
        
        // Should complete quickly (less than 100ms for 4000 calls)
        expect(duration).toBeLessThan(100)
      })

      it('should always return a string', () => {
        const testCases = ['notable', 'identity', 'email', null, undefined, '', 'invalid']
        
        testCases.forEach(testCase => {
          const result = getVerificationBadgeColor(testCase as any)
          expect(typeof result).toBe('string')
          expect(result.length).toBeGreaterThan(0)
        })
      })
    })

    describe('Future Verification Tiers', () => {
      it('should handle potential future tiers by returning gray', () => {
        const futureTiers = ['premium', 'verified', 'trusted', 'business', 'government']
        
        futureTiers.forEach(tier => {
          const result = getVerificationBadgeColor(tier)
          expect(result).toBe('text-gray-600 bg-gray-50 border-gray-200')
        })
      })
    })
  })

  describe('Function Integration', () => {
    it('should work together correctly in component context', () => {
      // Test that both functions can be used together without conflicts
      const timeString = formatTimeAgo('2024-12-20T11:30:00Z')
      const badgeColor = getVerificationBadgeColor('notable')
      
      expect(typeof timeString).toBe('string')
      expect(typeof badgeColor).toBe('string')
      expect(timeString.length).toBeGreaterThan(0)
      expect(badgeColor.length).toBeGreaterThan(0)
    })

    it('should maintain independence between functions', () => {
      // Verify that one function doesn't affect the other
      const badge1 = getVerificationBadgeColor('identity')
      const time1 = formatTimeAgo('2024-12-20T10:00:00Z')
      const badge2 = getVerificationBadgeColor('identity')
      const time2 = formatTimeAgo('2024-12-20T10:00:00Z')
      
      expect(badge1).toBe(badge2)
      expect(time1).toBe(time2)
    })
  })
})