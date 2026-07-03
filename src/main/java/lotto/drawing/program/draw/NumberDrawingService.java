package lotto.drawing.program.draw;

import java.security.SecureRandom;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class NumberDrawingService {

    private final SecureRandom random = new SecureRandom();

    public List<Integer> draw(GameType gameType) {
        return drawNumbers(gameType.getNumbersToPick(), gameType.getMaxNumber());
    }

    public List<Integer> drawExtraNumbers(GameType gameType) {
        if (!gameType.hasExtraNumbers()) {
            return List.of();
        }

        return drawNumbers(gameType.getExtraNumbersToPick(), gameType.getMaxExtraNumber());
    }

    private List<Integer> drawNumbers(int numbersToPick, int maxNumber) {
        List<Integer> pool = new ArrayList<>();

        for (int number = 1; number <= maxNumber; number++) {
            pool.add(number);
        }

        Collections.shuffle(pool, random);

        return pool.stream()
                .limit(numbersToPick)
                .sorted()
                .toList();
    }
}
