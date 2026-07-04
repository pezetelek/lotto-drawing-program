package lotto.drawing.program.archive;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import lotto.drawing.program.draw.GameType;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

@Service
public class ArchiveService {

    private final ArchivedDrawRepository archivedDrawRepository;

    public ArchiveService(ArchivedDrawRepository archivedDrawRepository) {
        this.archivedDrawRepository = archivedDrawRepository;
    }

    public List<ArchivedDrawDto> findByGameType(GameType gameType) {
        return archivedDrawRepository.findByGameTypeOrderByDrawDateDesc(gameType).stream()
                .map(ArchivedDrawDto::from)
                .toList();
    }

    @Transactional
    public ArchivedDrawDto create(ArchivedDrawRequest request) {
        if (archivedDrawRepository.existsByGameTypeAndDrawDate(request.gameType(), request.drawDate())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Draw already exists for this game and date.");
        }

        List<Integer> numbers = sortedCopy(request.numbers());
        List<Integer> extraNumbers = sortedCopy(request.extraNumbers() == null ? List.of() : request.extraNumbers());
        validateDraw(request.gameType(), numbers, extraNumbers);

        ArchivedDraw saved = archivedDrawRepository.save(
                new ArchivedDraw(request.gameType(), request.drawDate(), numbers, extraNumbers)
        );

        return ArchivedDrawDto.from(saved);
    }

    @Transactional
    public ArchiveImportResultDto importCsv(MultipartFile file) {
        if (file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "CSV file is empty.");
        }

        int imported = 0;
        int skipped = 0;
        List<String> errors = new ArrayList<>();

        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8))) {
            String line;
            int lineNumber = 0;

            while ((line = reader.readLine()) != null) {
                lineNumber++;

                if (line.isBlank() || isHeader(line, lineNumber)) {
                    continue;
                }

                try {
                    CsvDraw csvDraw = parseCsvDraw(line);

                    if (archivedDrawRepository.existsByGameTypeAndDrawDate(csvDraw.gameType(), csvDraw.drawDate())) {
                        skipped++;
                        continue;
                    }

                    validateDraw(csvDraw.gameType(), csvDraw.numbers(), csvDraw.extraNumbers());
                    archivedDrawRepository.save(new ArchivedDraw(
                            csvDraw.gameType(),
                            csvDraw.drawDate(),
                            csvDraw.numbers(),
                            csvDraw.extraNumbers()
                    ));
                    imported++;
                } catch (IllegalArgumentException ex) {
                    errors.add("Line " + lineNumber + ": " + ex.getMessage());
                }
            }
        } catch (IOException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot read CSV file.", ex);
        }

        return new ArchiveImportResultDto(imported, skipped, errors);
    }

    private CsvDraw parseCsvDraw(String line) {
        List<String> columns = splitCsvLine(line);

        if (columns.size() < 3 || columns.size() > 4) {
            throw new IllegalArgumentException("Expected columns: gameType,drawDate,numbers,extraNumbers.");
        }

        try {
            GameType gameType = GameType.valueOf(columns.get(0).trim());
            LocalDate drawDate = LocalDate.parse(columns.get(1).trim());
            List<Integer> numbers = sortedCopy(parseNumbers(columns.get(2)));
            List<Integer> extraNumbers = columns.size() == 4 ? sortedCopy(parseNumbers(columns.get(3))) : List.of();

            return new CsvDraw(gameType, drawDate, numbers, extraNumbers);
        } catch (DateTimeParseException ex) {
            throw new IllegalArgumentException("Invalid date. Use yyyy-MM-dd.");
        } catch (IllegalArgumentException ex) {
            throw new IllegalArgumentException(ex.getMessage());
        }
    }

    private List<String> splitCsvLine(String line) {
        List<String> columns = new ArrayList<>();
        StringBuilder current = new StringBuilder();
        boolean quoted = false;

        for (int index = 0; index < line.length(); index++) {
            char character = line.charAt(index);

            if (character == '"') {
                quoted = !quoted;
            } else if (character == ',' && !quoted) {
                columns.add(current.toString().trim());
                current.setLength(0);
            } else {
                current.append(character);
            }
        }

        columns.add(current.toString().trim());

        return columns;
    }

    private List<Integer> parseNumbers(String value) {
        if (value == null || value.isBlank()) {
            return List.of();
        }

        List<Integer> numbers = new ArrayList<>();
        String normalized = value.replace("\"", "");

        for (String rawNumber : normalized.split(",")) {
            if (!rawNumber.isBlank()) {
                numbers.add(Integer.parseInt(rawNumber.trim()));
            }
        }

        return numbers;
    }

    private void validateDraw(GameType gameType, List<Integer> numbers, List<Integer> extraNumbers) {
        validateNumberGroup(numbers, gameType.getNumbersToPick(), gameType.getMaxNumber(), "numbers");
        validateNumberGroup(extraNumbers, gameType.getExtraNumbersToPick(), gameType.getMaxExtraNumber(), "extraNumbers");
    }

    private void validateNumberGroup(List<Integer> numbers, int expectedCount, int maxNumber, String fieldName) {
        if (numbers.size() != expectedCount) {
            throw new IllegalArgumentException(fieldName + " must contain exactly " + expectedCount + " values.");
        }

        Set<Integer> uniqueNumbers = new HashSet<>(numbers);

        if (uniqueNumbers.size() != numbers.size()) {
            throw new IllegalArgumentException(fieldName + " contains duplicated values.");
        }

        for (Integer number : numbers) {
            if (number == null || number < 1 || number > maxNumber) {
                throw new IllegalArgumentException(fieldName + " contains value outside range 1-" + maxNumber + ".");
            }
        }
    }

    private List<Integer> sortedCopy(List<Integer> numbers) {
        return numbers.stream()
                .sorted()
                .toList();
    }

    private boolean isHeader(String line, int lineNumber) {
        return lineNumber == 1 && line.toLowerCase().startsWith("gametype,");
    }

    private record CsvDraw(
            GameType gameType,
            LocalDate drawDate,
            List<Integer> numbers,
            List<Integer> extraNumbers
    ) {
    }
}
