package lotto.drawing.program.archive;

import java.time.LocalDate;
import java.util.List;
import lotto.drawing.program.draw.GameType;

public record ArchivedDrawDto(
        Long id,
        GameType gameType,
        Long drawNumber,
        LocalDate drawDate,
        List<Integer> numbers,
        List<Integer> extraNumbers
) {
    static ArchivedDrawDto from(ArchivedDraw draw) {
        return new ArchivedDrawDto(
                draw.getId(),
                draw.getGameType(),
                draw.getDrawNumber(),
                draw.getDrawDate(),
                List.copyOf(draw.getNumbers()),
                List.copyOf(draw.getExtraNumbers())
        );
    }
}
