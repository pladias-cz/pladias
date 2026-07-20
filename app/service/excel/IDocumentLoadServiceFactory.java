package service.excel;

import play.i18n.Messages;

public interface IDocumentLoadServiceFactory {
    IDocumentLoadService getDocumentLoadService(IRecordColumnMapper colMapper, Messages messages);
}
