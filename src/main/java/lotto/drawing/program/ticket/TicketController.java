package lotto.drawing.program.ticket;

import java.util.List;
import lotto.drawing.program.draw.GameType;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/draw")
public class TicketController {

    private static final int MIN_TICKET_COUNT = 1;
    private static final int MAX_TICKET_COUNT = 10;

    private final TicketService ticketService;

    public TicketController(TicketService ticketService) {
        this.ticketService = ticketService;
    }

    @PostMapping
    public List<TicketDto> generate(@RequestParam GameType gameType, @RequestParam(defaultValue = "1") int count) {
        if (count < MIN_TICKET_COUNT || count > MAX_TICKET_COUNT) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Count must be between " + MIN_TICKET_COUNT + " and " + MAX_TICKET_COUNT);
        }

        return ticketService.generate(gameType, count);
    }
}
