package dto.selectItems;

import models.Author;

public record CollectorOptionDto(
    Integer id,
    String name,
    String label
) {
    public static CollectorOptionDto fromAuthor(Author collector) {
        return new CollectorOptionDto(
            collector.getId(),
            collector.getSurname() + " " + collector.getName(),
            collector.getSurname()
        );
    }
}
