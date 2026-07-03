package lotto.drawing.program.ticket;

import lotto.drawing.program.draw.GameType;
import lotto.drawing.program.draw.NumberDrawingService;
import org.springframework.stereotype.Service;

@Service
public class TicketService {

    private final NumberDrawingService numberDrawingService;

    public TicketService(NumberDrawingService numberDrawingService) {
        this.numberDrawingService = numberDrawingService;
    }

    public TicketDto generate(GameType gameType) {
        return TicketDto.of(
                gameType,
                numberDrawingService.draw(gameType),
                numberDrawingService.drawExtraNumbers(gameType)
        );
    }
}
