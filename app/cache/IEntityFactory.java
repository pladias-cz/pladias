package cache;

interface IEntityFactory<T, R>
{
	R fetch(T id);
}