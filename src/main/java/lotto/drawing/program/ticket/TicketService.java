package lotto.drawing.program.ticket;

import java.util.List;
import java.util.HashSet;
import java.util.Set;
import lotto.drawing.program.archive.ArchivedDraw;
import lotto.drawing.program.archive.ArchivedDrawRepository;
import lotto.drawing.program.draw.GameType;
import lotto.drawing.program.draw.NumberDrawingService;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class TicketService {

    private static final int MAX_GENERATION_ATTEMPTS = 10_000;

    private final NumberDrawingService numberDrawingService;
    private final ArchivedDrawRepository archivedDrawRepository;

    public TicketService(NumberDrawingService numberDrawingService, ArchivedDrawRepository archivedDrawRepository) {
        this.numberDrawingService = numberDrawingService;
        this.archivedDrawRepository = archivedDrawRepository;
    }

    public TicketDto generate(GameType gameType) {
        return TicketDto.of(
                gameType,
                numberDrawingService.draw(gameType),
                numberDrawingService.drawExtraNumbers(gameType)
        );
    }

    @Transactional(readOnly = true)
    public List<TicketDto> generate(GameType gameType, int count, TicketGenerationOptions options) {
        ArchivedDraw latestDraw = options.excludeLastDraw()
                ? archivedDrawRepository.findFirstByGameTypeOrderByDrawDateDescDrawNumberDesc(gameType).orElse(null)
                : null;
        Set<String> historicalSets = new HashSet<>();
        if (options.uniqueHistorical()) {
            historicalSets.addAll(archivedDrawRepository.findNumberSignaturesByGameType(gameType.name()));
        }

        List<TicketDto> tickets = new java.util.ArrayList<>();
        Set<String> generatedSets = new HashSet<>();
        int attempts = 0;

        while (tickets.size() < count && attempts++ < MAX_GENERATION_ATTEMPTS) {
            TicketDto candidate = generate(gameType);
            String signature = signature(candidate.numbers(), candidate.extraNumbers());
            if (generatedSets.contains(signature)
                    || !matchesOptions(candidate, gameType, options, latestDraw, historicalSets)) {
                continue;
            }
            generatedSets.add(signature);
            tickets.add(candidate);
        }

        if (tickets.size() < count) {
            throw new ResponseStatusException(
                    HttpStatus.UNPROCESSABLE_ENTITY,
                    "Nie udało się wygenerować zestawów spełniających wszystkie wybrane warunki."
            );
        }
        return tickets;
    }

    private boolean matchesOptions(
            TicketDto candidate,
            GameType gameType,
            TicketGenerationOptions options,
            ArchivedDraw latestDraw,
            Set<String> historicalSets
    ) {
        if (options.excludeLastDraw() && latestDraw != null
                && (hasCommonNumber(candidate.numbers(), latestDraw.getNumbers())
                || hasCommonNumber(candidate.extraNumbers(), latestDraw.getExtraNumbers()))) {
            return false;
        }
        if (options.uniqueHistorical()
                && historicalSets.contains(signature(candidate.numbers(), candidate.extraNumbers()))) {
            return false;
        }
        if (options.balancedParity()
                && (!isParityBalanced(candidate.numbers()) || !isParityBalanced(candidate.extraNumbers()))) {
            return false;
        }
        if (options.balancedRange()
                && (!isRangeBalanced(candidate.numbers(), gameType.getMaxNumber())
                || !isRangeBalanced(candidate.extraNumbers(), gameType.getMaxExtraNumber()))) {
            return false;
        }
        return !options.maxTwoConsecutive()
                || (hasAtMostTwoConsecutive(candidate.numbers())
                && hasAtMostTwoConsecutive(candidate.extraNumbers()));
    }

    private boolean hasCommonNumber(List<Integer> first, List<Integer> second) {
        return first.stream().anyMatch(second::contains);
    }

    private boolean isParityBalanced(List<Integer> numbers) {
        if (numbers.isEmpty()) {
            return true;
        }
        long even = numbers.stream().filter(number -> number % 2 == 0).count();
        return Math.abs(even - (numbers.size() - even)) <= 1;
    }

    private boolean isRangeBalanced(List<Integer> numbers, int maxNumber) {
        if (numbers.isEmpty()) {
            return true;
        }
        int lowerHalfMaximum = maxNumber / 2;
        long lower = numbers.stream().filter(number -> number <= lowerHalfMaximum).count();
        return Math.abs(lower - (numbers.size() - lower)) <= 1;
    }

    private boolean hasAtMostTwoConsecutive(List<Integer> numbers) {
        int consecutive = 1;
        for (int index = 1; index < numbers.size(); index++) {
            consecutive = numbers.get(index) == numbers.get(index - 1) + 1 ? consecutive + 1 : 1;
            if (consecutive > 2) {
                return false;
            }
        }
        return true;
    }

    private String signature(List<Integer> numbers, List<Integer> extraNumbers) {
        return numbers.stream().sorted().map(String::valueOf).collect(java.util.stream.Collectors.joining(","))
                + ":"
                + extraNumbers.stream().sorted().map(String::valueOf).collect(java.util.stream.Collectors.joining(","));
    }
}
