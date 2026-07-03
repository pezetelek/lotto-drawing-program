package lotto.drawing.program.ticket;

import java.time.LocalDateTime;
import java.util.List;
import lotto.drawing.program.draw.GameType;

public record TicketDto(
        Long id,
        GameType gameType,
        List<Integer> numbers,
        List<Integer> extraNumbers,
        LocalDateTime createdAt
) {
    static TicketDto of(GameType gameType, List<Integer> numbers, List<Integer> extraNumbers) {
        return new TicketDto(null, gameType, numbers, extraNumbers, LocalDateTime.now());
    }
}
