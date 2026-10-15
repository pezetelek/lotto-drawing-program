package lotto.drawing.program.archive;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.util.List;
import lotto.drawing.program.draw.GameType;

public record ArchivedDrawRequest(
        @NotNull GameType gameType,
        Long drawNumber,
        @NotNull LocalDate drawDate,
        @NotEmpty List<Integer> numbers,
        List<Integer> extraNumbers
) {
}
