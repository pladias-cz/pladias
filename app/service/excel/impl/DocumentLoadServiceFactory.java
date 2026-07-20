package service.excel.impl;

import play.i18n.Messages;
import service.config.IConfigService;
import service.excel.IDocumentLoadService;
import service.excel.IDocumentLoadServiceFactory;
import service.excel.IRecordColumnMapper;
import service.excel.impl.wrapper.NonVascularRecordWrapperBuilder;
import service.excel.impl.wrapper.RecordDetailsBuilderBase;
import service.excel.impl.wrapper.VascularRecordWrapperBuilder;
import utils.MapSquareResolver;

import javax.inject.Inject;

public class DocumentLoadServiceFactory implements IDocumentLoadServiceFactory {
    private final IConfigService _configService;
    private final MapSquareResolver _mapSquareResolver;

    @Inject
    public DocumentLoadServiceFactory(IConfigService configService, MapSquareResolver squareResolver) {
        _configService = configService;
        _mapSquareResolver = squareResolver;
    }

    @Override
    public IDocumentLoadService getDocumentLoadService(IRecordColumnMapper colMapper, Messages messages) {
        RecordDetailsBuilderBase builder;
        if (_configService.isVascular())
            builder = new VascularRecordWrapperBuilder(_mapSquareResolver, colMapper, messages);
        else
            builder = new NonVascularRecordWrapperBuilder(_mapSquareResolver, colMapper, messages);

        return new DocumentLoadService(builder);
    }
}
