package lotto.drawing.program.archive;

import java.util.List;

public record ArchiveImportResultDto(
        int imported,
        int skipped,
        List<String> errors
) {
}
