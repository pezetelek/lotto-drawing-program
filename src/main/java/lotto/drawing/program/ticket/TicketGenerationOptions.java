package lotto.drawing.program.ticket;

public record TicketGenerationOptions(
        boolean excludeLastDraw,
        boolean uniqueHistorical,
        boolean balancedParity,
        boolean balancedRange,
        boolean maxTwoConsecutive
) {
}
